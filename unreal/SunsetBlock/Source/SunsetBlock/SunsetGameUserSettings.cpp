#include "SunsetGameUserSettings.h"
#include "Engine/Engine.h"
#include "HAL/IConsoleManager.h"

static void SetCVarFloat(const TCHAR* Name, float Value)
{
	if (IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(Name))
	{
		CVar->Set(Value, ECVF_SetByGameSetting);
	}
}
static void SetCVarInt(const TCHAR* Name, int32 Value)
{
	if (IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(Name))
	{
		CVar->Set(Value, ECVF_SetByGameSetting);
	}
}

USunsetGameUserSettings* USunsetGameUserSettings::GetSunsetSettings()
{
	return Cast<USunsetGameUserSettings>(GEngine ? GEngine->GetGameUserSettings() : nullptr);
}

void USunsetGameUserSettings::SetUpscaleMode(EUpscaleMode Mode)
{
	UpscaleMode = Mode;
	ApplyUpscale();
}

void USunsetGameUserSettings::ApplyQualityPreset(ESunsetQuality Quality)
{
	// Maps to engine scalability groups (Shadows/GI/Post/View Distance/Textures/Effects).
	const int32 Level = static_cast<int32>(Quality); // 0..3 = Low..Ultra
	ScalabilityQuality.SetFromSingleQualityLevel(Level);
	ApplySettings(false);
}

void USunsetGameUserSettings::ApplyUpscale()
{
	float ScreenPercentage = 100.f;
	bool bWantsDLSS = false;

	switch (UpscaleMode)
	{
	case EUpscaleMode::Native:           ScreenPercentage = 100.f; break;
	case EUpscaleMode::TSR_Quality:      ScreenPercentage = 67.f;  break;
	case EUpscaleMode::TSR_Balanced:     ScreenPercentage = 58.f;  break;
	case EUpscaleMode::TSR_Performance:  ScreenPercentage = 50.f;  break;
	case EUpscaleMode::DLSS_Quality:     ScreenPercentage = 67.f;  bWantsDLSS = true; break;
	case EUpscaleMode::DLSS_Balanced:    ScreenPercentage = 58.f;  bWantsDLSS = true; break;
	case EUpscaleMode::DLSS_Performance: ScreenPercentage = 50.f;  bWantsDLSS = true; break;
	}

	// TSR is the always-available temporal upscaler (r.AntiAliasingMethod = 4).
	SetCVarInt(TEXT("r.AntiAliasingMethod"), 4);
	SetCVarFloat(TEXT("r.ScreenPercentage"), ScreenPercentage);

	if (bWantsDLSS)
	{
		if (IsDLSSSupported())
		{
			// Let the DLSS plugin own the resolution; the BP hook calls UDLSSLibrary::SetDLSSMode.
			ApplyDLSSMode(UpscaleMode);
		}
		// else: DLSS unavailable -> we already set the equivalent TSR screen percentage above (fallback).
	}
}
