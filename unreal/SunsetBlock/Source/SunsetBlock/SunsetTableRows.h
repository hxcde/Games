#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "SunsetTableRows.generated.h"

// Positions are in PROTOTYPE METRES (see docs/DESIGN_REFERENCE.md).
// Spawner Blueprints multiply by 100 for Unreal units and map axes to the
// chosen world orientation. Imported via Content/Data/*.csv.

/** Content/Data/Shops.csv  -> DataTable(FShopRow) */
USTRUCT(BlueprintType)
struct FShopRow : public FTableRowBase
{
	GENERATED_BODY()
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString ShopName;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Type;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float X_m = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float Z_m = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float FaceNormalX = -1.f; // -1 = faces -X, +1 = faces +X
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString SignColorHex;     // e.g. FF8A3C
};

/** Content/Data/Interactions.csv  -> DataTable(FInteractionRow) */
USTRUCT(BlueprintType)
struct FInteractionRow : public FTableRowBase
{
	GENERATED_BODY()
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Who;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Prompt;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Line1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Line2;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float X_m = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float Y_m = 0.f; // height
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float Z_m = 0.f;
};

/** Content/Data/NPCSpawns.csv  -> DataTable(FNpcSpawnRow) */
USTRUCT(BlueprintType)
struct FNpcSpawnRow : public FTableRowBase
{
	GENERATED_BODY()
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Role;   // Customer/Vendor/Security/Pedestrian/Homeless
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float X_m = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float Z_m = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString PathHint;
};
