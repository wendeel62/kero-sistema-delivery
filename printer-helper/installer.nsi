; Kero Printer Helper - NSIS Installer
; Requires: NSIS 3+ (https://nsis.sourceforge.io/)
;
; Build:
;   makensis installer.nsi

!define PRODUCT_NAME "Kero Printer Helper"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Kero Delivery"
!define PRODUCT_WEB_SITE "https://kero.app"

!include "MUI2.nsh"
!include "FileFunc.nsh"

; ------------------------------------------------
; General
; ------------------------------------------------
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "..\public\Kero-Printer-Setup.exe"
InstallDir "$LOCALAPPDATA\Kero\PrinterHelper"
RequestExecutionLevel user

; ------------------------------------------------
; Interface
; ------------------------------------------------
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "Portuguese"

; ------------------------------------------------
; Sections
; ------------------------------------------------
Section "Install" SecMain
    SetOutPath "$INSTDIR"
    File "dist\Kero-Printer-Helper.exe"

    ; Create startup shortcut
    CreateDirectory "$SHELLEXECUTE\Startup"
    CreateShortcut "$SHELLEXECUTE\Startup\Kero Printer Helper.lnk" "$INSTDIR\Kero-Printer-Helper.exe"

    ; Write uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; Add to Add/Remove Programs
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
        "DisplayName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
        "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
        "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
        "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" \
        "InstallLocation" "$INSTDIR"

    ; Register firewall exception (Windows Defender)
    ExecWait 'netsh advfirewall firewall add rule name="Kero Printer Helper" dir=in action=allow program="$INSTDIR\Kero-Printer-Helper.exe" profile=private'

    ; Start the helper
    Exec "$INSTDIR\Kero-Printer-Helper.exe"
SectionEnd

Section "Uninstall"
    ; Stop the helper
    ExecWait 'taskkill /f /im "Kero-Printer-Helper.exe"'

    ; Remove firewall rule
    ExecWait 'netsh advfirewall firewall delete rule name="Kero Printer Helper"'

    ; Remove shortcut
    Delete "$SHELLEXECUTE\Startup\Kero Printer Helper.lnk"

    ; Remove files
    Delete "$INSTDIR\Kero-Printer-Helper.exe"
    Delete "$INSTDIR\Uninstall.exe"
    RMDir "$INSTDIR"

    ; Remove registry entries
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
SectionEnd
