# Android 업데이트 순서 (2026-10-14)

Firebase Android 앱 등록과 설정 파일 추가가 완료되었습니다. 기존 설치 앱에 적용하려면 아래 작업 폴더에서 새 빌드를 만들어 설치해야 합니다.

## 1. 정확한 작업 폴더 열기

이번 수정본은 다음 폴더에 있습니다. 기존 원본 폴더와 임시 폴더에는 다른 변경사항이 있으므로 빌드 위치를 확인하세요.

```powershell
Set-Location 'E:\NCOA\BLC\blc_calendar\release-assets\mobile-audit-20261013'
```

Firebase 프로젝트는 `blc-calendar-e302f`, Android 패키지는 `dev.pages.blccalendar`입니다. `android/app/google-services.json`은 이미 추가되어 있습니다. Firebase 앱 닉네임은 스토어 이름이나 설치 앱 이름을 변경하지 않습니다.

## 2. Play Console에서 가장 높은 버전 코드 확인

기존 앱의 Test and release → Latest releases and bundles에서 프로덕션 및 테스트 트랙에 업로드했던 가장 높은 versionCode를 확인합니다.

`android/app/build.gradle`의 versionCode를 그보다 큰 미사용 정수로 변경합니다. 현재 작업 소스는 11입니다. 예를 들어 가장 높은 번호가 12라면 13을 사용합니다. versionName은 사용자에게 표시할 버전으로 정합니다. applicationId는 변경하지 않습니다. minSdkVersion은 Capacitor 8 및 기존 로컬 설정에 맞춰 24로 복구했습니다.

## 3. 웹 수정본을 Android에 반영

위 작업 폴더의 PowerShell에서 각각 실행하고, 오류가 없을 때 다음 명령으로 진행합니다.

```powershell
npm.cmd run build
npx.cmd cap sync android
```

기존 AdMob 소스맵 경고와 빌드 실패를 구분합니다. 실제 오류가 발생하면 업로드를 진행하지 않습니다.

## 4. Android Studio에서 서명된 AAB 생성

Android Studio → Open에서 작업 폴더 아래 `android`를 엽니다. Gradle 동기화가 끝나면 Build → Generate Signed Bundle / APK → Android App Bundle을 선택합니다.

이 앱에 이전부터 사용하던 upload keystore와 alias를 선택하고 본인이 비밀번호를 입력합니다. 기존 앱 업데이트이므로 새 키를 임의로 만들지 않습니다. release 변형을 선택해 AAB를 생성합니다. 완료 안내의 locate로 실제 출력 파일을 확인합니다. 이번에 만든 파일인지 수정 시간과 버전 코드를 확인합니다.

디버그 APK는 개발 확인용입니다. Play Store 설치 앱과 서명이 다를 수 있으므로 업데이트 배포에는 서명된 AAB와 내부 테스트 트랙을 사용합니다.

## 5. Google Play 내부 테스트에 업로드

기존 앱 → Test and release → Testing → Internal testing으로 이동합니다. Testers에서 테스트할 Google 계정을 추가하고 저장합니다. Releases에서 새 릴리스를 만들고 새 AAB를 업로드합니다. 릴리스 노트 입력 후 오류 및 콘솔의 게시 상태를 확인하여 내부 테스트 릴리스를 게시합니다. 처음 설정하거나 검토가 요구되는 경우 즉시 이용 가능하지 않을 수 있습니다.

## 6. 테스트 휴대폰에서 실제 업데이트 설치

등록한 Google 계정으로 내부 테스트 참여 링크를 열고 참여합니다. 이어서 Play Store에서 앱을 업데이트합니다. 앱 정보의 버전이 새 빌드와 일치하는지 확인합니다. 업데이트 버튼이 없으면 테스트 계정, 참여 여부, 게시 상태, 버전 코드를 확인합니다.

업로드 또는 심사 승인만으로 기존 휴대폰에 새 코드가 설치되지는 않습니다. 앱을 삭제하기 전에 업데이트 경로부터 확인합니다.

## 7. 기능 확인

| 항목 | 확인할 동작 |
|---|---|
| BLC Chief | 일정이 있는 날짜에서 BLC 일정 표시, 로그아웃 후 같은 계정으로 재로그인해도 일정 유지 |
| KTA Chief | KTA 일정 표시, BLC 일정과 섞이지 않음 |
| 알림 안내창 | X와 Not now로 닫힘, 실패하거나 로딩 중이어도 닫힘, 재로그인 후 불필요하게 재등장하지 않음 |
| 알림 설정 | 휴대폰 알림 권한 허용 후 ON 성공, OFF 성공, 다시 ON 성공 |
| 알림 수신 | 사전에 합의한 테스트 알림으로 앱 실행 중 및 백그라운드 수신 확인, 알림을 누르면 올바른 과정·날짜로 이동 |
| Chief 편집 | 담당 과정에서 합의한 테스트 이벤트 수정·저장 후 다른 기기에서 확인, 이후 원래 값 복원; 다른 과정 편집 권한 없음 |
| Commander | Settings에서 BLC/KTA 전환, 읽기 전용 권한 유지 |
| 학생 | 배정된 사이클만 표시 |
| 시작 광고 | 첫 적격 실행 및 1시간 후 복귀 시 확인; 광고 재고·동의·네트워크에 따라 표시되지 않을 수 있음, 광고 실패로 앱이 막히지 않음 |

알림 테스트는 수신자와 테스트 시간을 정한 뒤 진행합니다. 단순히 스위치가 ON인 것만으로 실제 푸시 도착이 검증된 것은 아닙니다. 오류가 남으면 설치 버전, 기종/Android 버전, 동작, 오류 문구와 발생 시간을 기록합니다. 로그인 코드나 토큰은 기록하지 않습니다.

## 8. 테스트 통과 후 프로덕션 배포

검증한 동일 빌드를 프로덕션으로 승격하거나 선택해 제출합니다. 심사와 게시 상태를 확인한 뒤 사용자들이 업데이트하도록 안내합니다. Android AAB는 iPhone 앱을 업데이트하지 않습니다. iPhone에도 클라이언트 수정 적용이 필요하면 별도 iOS 빌드와 검증이 필요합니다.

현재 변경사항은 로컬에 있으며 GitHub push, 서명된 릴리스 빌드, Play 제출은 별도입니다. GitHub 기반 빌드 자동화를 사용할 경우 먼저 이번 수정과 Firebase 설정 파일이 해당 빌드 소스에 포함되었는지 확인합니다.

공식 안내: [앱 서명](https://developer.android.com/studio/publish/app-signing), [내부 테스트](https://support.google.com/googleplay/android-developer/answer/9845334), [릴리스 게시](https://support.google.com/googleplay/android-developer/answer/9859348).
