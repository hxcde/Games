#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameUserSettings.h"
#include "SunsetGameUserSettings.generated.h"

UENUM(BlueprintType)
enum class ESunsetQuality : uint8 { Low, Medium, High, Ultra };

UENUM(BlueprintType)
enum class EUpscaleMode : uint8
{
	Native,
	TSR_Quality,
	TSR_Balanced,
	TSR_Performance,
	DLSS_Quality,
	DLSS_Balanced,
	DLSS_Performance
};

/**
 * Graphics settings: Low/Medium/High/Ultra presets + an upscaling menu
 * (Native / TSR / DLSS). DLSS is enabled in Blueprint via the NVIDIA plugin
 * nodes; if DLSS is unsupported we fall back to TSR automatically.
 */
UCLASS(Config = GameUserSettings)
class SUNSETBLOCK_API USunsetGameUserSettings : public UGameUserSettings
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "Settings")
	static USunsetGameUserSettings* GetSunsetSettings();

	UPROPERTY(Config, BlueprintReadWrite, Category = "Settings")
	EUpscaleMode UpscaleMode = EUpscaleMode::TSR_Quality;

	UFUNCTION(BlueprintCallable, Category = "Settings")
	void SetUpscaleMode(EUpscaleMode Mode);

	/** Applies a Low/Medium/High/Ultra scalability preset. */
	UFUNCTION(BlueprintCallable, Category = "Settings")
	void ApplyQualityPreset(ESunsetQuality Quality);

	/** Applies the current upscaling mode (TSR via CVars; DLSS via the BP hook). */
	UFUNCTION(BlueprintCallable, Category = "Settings")
	void ApplyUpscale();

	/** Implement in WBP_GraphicsMenu using UDLSSLibrary::IsDLSSSupported(). Default = false. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Settings")
	bool IsDLSSSupported() const;

	/** Implement in WBP_GraphicsMenu using UDLSSLibrary::SetDLSSMode(...). */
	UFUNCTION(BlueprintImplementableEvent, Category = "Settings")
	void ApplyDLSSMode(EUpscaleMode Mode);
};
