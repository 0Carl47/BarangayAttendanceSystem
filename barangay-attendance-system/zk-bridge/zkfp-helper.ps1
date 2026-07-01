param([string]$Command='capture',[string]$Arg1='',[string]$Arg2='')
$ErrorActionPreference='Stop'
$dir=Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PATH=$dir+';'+$env:PATH

$cs='using System;'
$cs+='using System.Runtime.InteropServices;'
$cs+='public static class ZK{'
$cs+='const string D="libzkfp";'
$cs+='[DllImport(D)]public static extern int ZKFPM_Init();'
$cs+='[DllImport(D)]public static extern int ZKFPM_Terminate();'
$cs+='[DllImport(D)]public static extern int ZKFPM_GetDeviceCount();'
$cs+='[DllImport(D)]public static extern IntPtr ZKFPM_OpenDevice(int i);'
$cs+='[DllImport(D)]public static extern int ZKFPM_CloseDevice(IntPtr h);'
$cs+='[DllImport(D)]public static extern int ZKFPM_GetParameters(IntPtr h,int c,[Out]byte[]v,ref uint s);'
$cs+='[DllImport(D)]public static extern int ZKFPM_AcquireFingerprint(IntPtr h,[Out]byte[]img,uint ci,[Out]byte[]tpl,ref uint ct);'
$cs+='[DllImport(D)]public static extern IntPtr ZKFPM_DBInit();'
$cs+='[DllImport(D)]public static extern int ZKFPM_DBFree(IntPtr h);'
$cs+='[DllImport(D)]public static extern int ZKFPM_DBMerge(IntPtr h,byte[]t1,byte[]t2,byte[]t3,byte[]reg,ref uint cr);'
$cs+='[DllImport(D)]public static extern int ZKFPM_DBAdd(IntPtr h,uint fid,byte[]tpl,uint cb);'
$cs+='[DllImport(D)]public static extern int ZKFPM_DBDel(IntPtr h,uint fid);'
$cs+='[DllImport(D)]public static extern int ZKFPM_DBClear(IntPtr h);'
$cs+='[DllImport(D)]public static extern int ZKFPM_DBIdentify(IntPtr h,byte[]tpl,uint cb,ref uint fid,ref uint score);'
$cs+='[DllImport(D)]public static extern int ZKFPM_VerifyByID(IntPtr h,uint fid,byte[]tpl,uint cb);'
$cs+='}'

try{Add-Type -TypeDefinition $cs -Language CSharp -ErrorAction Stop}
catch{if($_.Exception.Message -notmatch 'already exists'){Write-Output '{"error":"Add-Type failed","code":-2}';exit 1}}

function OK($d){Write-Output($d|ConvertTo-Json -Compress)}
function ERR($m,$c=-1){Write-Output(@{error=$m;code=$c}|ConvertTo-Json -Compress);exit 1}

function InitDev{
  $r=[ZK]::ZKFPM_Init()
  if($r -ne 0){ERR "ZKFPM_Init failed: $r" $r}
  $n=[ZK]::ZKFPM_GetDeviceCount()
  if($n -le 0){[ZK]::ZKFPM_Terminate()|Out-Null;ERR 'No ZKTeco device. Plug in R20i.'}
  $h=[ZK]::ZKFPM_OpenDevice(0)
  if($h -eq [IntPtr]::Zero){[ZK]::ZKFPM_Terminate()|Out-Null;ERR 'Cannot open device.'}
  return $h
}

function GetSz($h){
  try{
    $b=New-Object byte[] 4;[uint32]$s=4
    [ZK]::ZKFPM_GetParameters($h,1,$b,[ref]$s)|Out-Null
    $w=[BitConverter]::ToInt32($b,0);$s=4
    [ZK]::ZKFPM_GetParameters($h,2,$b,[ref]$s)|Out-Null
    $hh=[BitConverter]::ToInt32($b,0)
    if($w -gt 0 -and $hh -gt 0){return [uint32]($w*$hh)}
  }catch{}
  return [uint32]100000
}

$cmd=$Command.ToLower().Trim()

if($cmd -eq 'capture'){
  $h=InitDev
  try{
    $sz=[int](GetSz $h)
    $ib=[byte[]]::new($sz)
    $tb=[byte[]]::new(2048)
    [uint32]$ct=2048
    $dl=(Get-Date).AddSeconds(30)
    $ret=-1
    while((Get-Date) -lt $dl){
      $ct=2048
      $ret=[ZK]::ZKFPM_AcquireFingerprint($h,$ib,[uint32]$sz,$tb,[ref]$ct)
      if($ret -eq 0 -and $ct -gt 0){break}
      Start-Sleep -Milliseconds 200
    }
    if($ret -ne 0 -or $ct -eq 0){ERR 'No finger detected in 30s.'}
    $tpl=[byte[]]::new($ct)
    [Array]::Copy($tb,$tpl,[int]$ct)
    $q=[Math]::Min(100,[Math]::Max(50,[int]($tpl.Length/20)))
    $img=''
    try{
      Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
      $bw=[byte[]]::new(4);[uint32]$bs=4
      [ZK]::ZKFPM_GetParameters($h,1,$bw,[ref]$bs)|Out-Null
      $iw=[BitConverter]::ToInt32($bw,0);$bs=4
      [ZK]::ZKFPM_GetParameters($h,2,$bw,[ref]$bs)|Out-Null
      $ih=[BitConverter]::ToInt32($bw,0)
      if($iw -gt 0 -and $ih -gt 0 -and $ib.Length -ge($iw*$ih)){
        $bmp=New-Object System.Drawing.Bitmap($iw,$ih,[System.Drawing.Imaging.PixelFormat]::Format8bppIndexed)
        $pal=$bmp.Palette
        for($pi=0;$pi -lt 256;$pi++){$pal.Entries[$pi]=[System.Drawing.Color]::FromArgb(255,$pi,$pi,$pi)}
        $bmp.Palette=$pal
        $bd=$bmp.LockBits([System.Drawing.Rectangle]::new(0,0,$iw,$ih),[System.Drawing.Imaging.ImageLockMode]::WriteOnly,[System.Drawing.Imaging.PixelFormat]::Format8bppIndexed)
        [System.Runtime.InteropServices.Marshal]::Copy($ib,0,$bd.Scan0,[Math]::Min($ib.Length,$bd.Stride*$ih))
        $bmp.UnlockBits($bd)
        $ms=New-Object System.IO.MemoryStream
        $bmp.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $img=[Convert]::ToBase64String($ms.ToArray())
        $ms.Dispose()
      }
    }catch{$img=''}
    OK @{template=[Convert]::ToBase64String($tpl);quality=[int]$q;image=$img}
  }finally{
    [ZK]::ZKFPM_CloseDevice($h)|Out-Null
    [ZK]::ZKFPM_Terminate()|Out-Null
  }
}elseif($cmd -eq 'merge'){
  # Merge 3 templates into one strong registration template
  # Arg1/Arg2/stdin => JSON {t1,t2,t3}
  try{
    $j=[Console]::In.ReadToEnd()
    $o=$j|ConvertFrom-Json
    $t1=[Convert]::FromBase64String($o.t1)
    $t2=[Convert]::FromBase64String($o.t2)
    $t3=[Convert]::FromBase64String($o.t3)
  }catch{ERR "merge parse: $_"}
  if($t1.Length -lt 32){ERR 't1 too short'}
  if($t2.Length -lt 32){ERR 't2 too short'}
  if($t3.Length -lt 32){ERR 't3 too short'}
  $db=[ZK]::ZKFPM_DBInit()
  if($db -eq [IntPtr]::Zero){ERR 'DBInit failed'}
  try{
    $reg=[byte[]]::new(2048)
    [uint32]$cr=2048
    $r=[ZK]::ZKFPM_DBMerge($db,$t1,$t2,$t3,$reg,[ref]$cr)
    if($r -ne 0){ERR "DBMerge failed: $r" $r}
    $merged=[byte[]]::new($cr)
    [Array]::Copy($reg,$merged,[int]$cr)
    OK @{merged=[Convert]::ToBase64String($merged);len=[int]$cr}
  }finally{[ZK]::ZKFPM_DBFree($db)|Out-Null}
}elseif($cmd -eq 'verify'){
  # 1:1 verify — compare scanned template against ONE stored template (by FID)
  # stdin => JSON {fid, stored}  (stored = base64 registered template)
  # Returns {matched, score} — score = VerifyByID return value (0=match)
  try{
    $j=[Console]::In.ReadToEnd()
    $o=$j|ConvertFrom-Json
    [uint32]$fid=[uint32]$o.fid
    $stored=[Convert]::FromBase64String($o.stored)
    $scan=[Convert]::FromBase64String($o.scan)
  }catch{ERR "verify parse: $_"}
  $db=[ZK]::ZKFPM_DBInit()
  if($db -eq [IntPtr]::Zero){ERR 'DBInit failed'}
  try{
    # Add stored template to in-memory DB with given FID
    $ra=[ZK]::ZKFPM_DBAdd($db,$fid,$stored,[uint32]$stored.Length)
    if($ra -ne 0){ERR "DBAdd failed: $ra" $ra}
    # VerifyByID: returns 0 if match, non-zero if no match
    $rv=[ZK]::ZKFPM_VerifyByID($db,$fid,$scan,[uint32]$scan.Length)
    $matched=($rv -eq 0)
    OK @{matched=$matched;raw=$rv;score=$(if($matched){80}else{0})}
  }finally{[ZK]::ZKFPM_DBFree($db)|Out-Null}
}elseif($cmd -eq 'identify'){
  # 1:N identify using VerifyByID loop (DBIdentify returns score=0 on R20i)
  # stdin => JSON {scan, templates:[{fid,tpl},...]}
  try{
    $j=[Console]::In.ReadToEnd()
    $o=$j|ConvertFrom-Json
    $scan=[Convert]::FromBase64String($o.scan)
    $templates=$o.templates
  }catch{ERR "identify parse: $_"}
  if($templates.Count -eq 0){OK @{matched=$false;fid=0;score=0};exit 0}
  $matchedFid=0;$found=$false
  foreach($t in $templates){
    $db=[ZK]::ZKFPM_DBInit()
    if($db -eq [IntPtr]::Zero){continue}
    try{
      $tdata=[Convert]::FromBase64String($t.tpl)
      $ra=[ZK]::ZKFPM_DBAdd($db,[uint32]$t.fid,$tdata,[uint32]$tdata.Length)
      if($ra -ne 0){continue}
      $rv=[ZK]::ZKFPM_VerifyByID($db,[uint32]$t.fid,$scan,[uint32]$scan.Length)
      if($rv -eq 0){$matchedFid=[int]$t.fid;$found=$true}
    }finally{[ZK]::ZKFPM_DBFree($db)|Out-Null}
    if($found){break}
  }
  OK @{matched=$found;fid=$matchedFid;score=$(if($found){80}else{0})}
}elseif($cmd -eq 'count'){
  $r=[ZK]::ZKFPM_Init()
  if($r -ne 0){ERR "Init failed: $r"}
  $n=[ZK]::ZKFPM_GetDeviceCount()
  [ZK]::ZKFPM_Terminate()|Out-Null
  OK @{count=[int]$n}
}else{
  ERR "Unknown command: $cmd"
}
