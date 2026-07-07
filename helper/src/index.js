#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig, saveConfig, CONFIG_DIR, PID_PATH } from './config.js';
import { log, logError } from './util/log.js';

const [, , command = 'serve', ...rest] = process.argv;

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

// retone test 전용 최소 프리셋 (실제 프리셋은 확장이 관리 — 헬퍼는 stateless)
const TEST_PRESETS = {
  polish: { id: 'polish', name: '심플 다듬기', instruction: '이런 글을 작성했는데 다듬어줘.' },
  concise: { id: 'concise', name: '간결', instruction: '핵심만 남기고 최대한 짧게 줄여줘.' },
  english: { id: 'english', name: '영어 번역', instruction: '자연스러운 네이티브 영어로 번역해줘. 원문 뉘앙스를 보존해줘.' },
};

switch (command) {
  case 'serve': {
    const { serve } = await import('./server.js');
    await serve();
    break;
  }

  case 'token': {
    const config = loadConfig();
    const { flags } = parseFlags(rest);
    if (flags.rotate) {
      config.token = crypto.randomBytes(16).toString('hex');
      saveConfig(config);
      log('토큰을 교체했습니다. 확장 옵션 페이지에도 새 토큰을 입력하세요.');
    }
    console.log(config.token);
    break;
  }

  case 'status': {
    const config = loadConfig();
    const base = `http://127.0.0.1:${config.port}`;
    try {
      const health = await (await fetch(`${base}/health`)).json();
      const models = await (await fetch(`${base}/v1/models`, {
        headers: { 'x-retone-token': config.token },
      })).json();
      log(`server: ${health.name} v${health.version} @ ${base}`);
      for (const p of models.providers) {
        log(`  ${p.id}: ${p.available ? `사용 가능 ${p.version ?? ''}`.trim() : `불가 (${p.reason})`}`);
      }
    } catch {
      logError(`서버가 실행 중이 아닙니다 (${base}). 시작: npm start`);
      process.exit(1);
    }
    break;
  }

  case 'test': {
    const config = loadConfig();
    const { flags, positional } = parseFlags(rest);
    const text = positional[0];
    if (!text) {
      logError('사용법: retone test "다듬을 문장" [--provider claude-cli] [--model sonnet] [--preset polish,concise]');
      process.exit(1);
    }
    const presetIds = String(flags.preset ?? 'polish').split(',');
    const presets = presetIds.map((id) => TEST_PRESETS[id]).filter(Boolean);
    if (presets.length === 0) {
      logError(`알 수 없는 preset. 사용 가능: ${Object.keys(TEST_PRESETS).join(', ')}`);
      process.exit(1);
    }
    const { rewrite } = await import('./rewrite.js');
    const provider = flags.provider ?? 'claude-cli';
    log(`provider=${provider} model=${flags.model ?? '(기본)'} presets=${presetIds.join(',')} — 실행 중...`);
    try {
      const result = await rewrite(config, { text, presets, provider, model: flags.model }, undefined);
      log(`완료 (${result.elapsedMs}ms, model=${result.model})`);
      for (const v of result.variants) {
        console.log(`\n[${v.presetId}]\n${v.text}`);
      }
    } catch (err) {
      logError(`실패 [${err.code ?? 'ERROR'}]: ${err.message}`);
      process.exit(1);
    }
    break;
  }

  case 'install': {
    if (process.platform !== 'darwin') {
      logError('install은 macOS(launchd)에서만 지원합니다.');
      process.exit(1);
    }
    const entry = fileURLToPath(import.meta.url);
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.retone.helper.plist');
    const logPath = path.join(CONFIG_DIR, 'helper.log');
    fs.mkdirSync(path.dirname(plistPath), { recursive: true });
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.retone.helper</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${entry}</string>
    <string>serve</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${logPath}</string>
  <key>StandardErrorPath</key><string>${logPath}</string>
</dict>
</plist>
`;
    fs.writeFileSync(plistPath, plist);
    spawnSync('launchctl', ['unload', plistPath], { stdio: 'ignore' }); // 재설치 대비
    const result = spawnSync('launchctl', ['load', plistPath], { stdio: 'inherit' });
    if (result.status === 0) {
      log('자동 시작 등록 완료 — 이제 로그인하면 헬퍼가 항상 실행됩니다.');
      log(`로그: ${logPath}`);
    } else {
      logError('launchctl load 실패. 수동 실행(npm start)을 사용하세요.');
      process.exit(1);
    }
    break;
  }

  case 'uninstall': {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.retone.helper.plist');
    spawnSync('launchctl', ['unload', plistPath], { stdio: 'ignore' });
    fs.rmSync(plistPath, { force: true });
    log('자동 시작 등록을 해제했습니다.');
    break;
  }

  case 'stop': {
    try {
      const pid = Number(fs.readFileSync(PID_PATH, 'utf8').trim());
      process.kill(pid, 'SIGTERM');
      log(`서버(pid ${pid})를 종료했습니다.`);
    } catch {
      logError('실행 중인 서버를 찾지 못했습니다.');
      process.exit(1);
    }
    break;
  }

  default:
    logError(`알 수 없는 명령: ${command}`);
    console.log('사용법: retone [serve|token [--rotate]|status|test <text>|install|uninstall|stop]');
    process.exit(1);
}
