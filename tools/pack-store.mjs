/**
 * 스토어 업로드용 패키징 — dist 를 zip 으로 묶되 manifest 의 `key` 를 제거한다.
 *
 * 🪤 `key` 는 로컬 개발에서 확장 ID 를 고정하는 필드다(Google OAuth 리디렉션 URI 가
 *    그 ID 에 묶여 있어 개발 중에는 반드시 필요). 하지만 **웹스토어는 이 필드가 있으면
 *    업로드를 거부한다** ("key 입력란은 매니페스트에 허용되지 않습니다").
 *    스토어가 자체적으로 ID 를 발급하기 때문이다.
 *    → dist 는 그대로 두고(로컬 로드 계속 가능), zip 에 들어가는 사본에서만 제거한다.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'extension', 'dist')
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'))
const version = manifest.version
const hadKey = 'key' in manifest

const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'retone-pack-'))
fs.cpSync(dist, staging, { recursive: true })
const staged = JSON.parse(fs.readFileSync(path.join(staging, 'manifest.json'), 'utf8'))
delete staged.key
fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify(staged, null, 2) + '\n')

const out = path.join(root, `retone-extension-v${version}.zip`)
fs.rmSync(out, { force: true })
execFileSync('zip', ['-rq', out, '.'], { cwd: staging })
fs.rmSync(staging, { recursive: true, force: true })

// 게이트 — zip 안에 key 가 남아 있으면 업로드가 거부되므로 여기서 실패시킨다
const listed = execFileSync('unzip', ['-p', out, 'manifest.json']).toString()
if (JSON.parse(listed).key !== undefined) {
  throw new Error('[pack] manifest 에 key 가 남아 있습니다 — 웹스토어가 거부합니다')
}
console.log(`→ ${path.basename(out)} (${fs.statSync(out).size} bytes)${hadKey ? ' · manifest key 제거됨' : ''}`)
