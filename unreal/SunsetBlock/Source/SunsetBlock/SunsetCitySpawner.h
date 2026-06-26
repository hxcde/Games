#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SunsetCitySpawner.generated.h"

class UDataTable;
class ACharacter;

/**
 * Data-driven placement helper. Drop ONE of these in the level, assign the three
 * DataTables (Content/Data/*.csv) and the actor/character classes, then press
 * "Build City" (CallInEditor) — it spawns shops, interaction stations and NPCs
 * at the prototype reference positions. Minimises manual placement.
 *
 * Coordinate mapping (prototype metres -> Unreal): configurable below.
 * Default: UE.X = -Z_m*scale (prototype -Z / sun-&-water side becomes forward),
 *          UE.Y =  X_m*scale,  UE.Z =  Y_m*scale, all relative to this actor.
 */
UCLASS()
class SUNSETBLOCK_API ASunsetCitySpawner : public AActor
{
	GENERATED_BODY()

public:
	ASunsetCitySpawner();

	UPROPERTY(EditAnywhere, Category = "Data") UDataTable* ShopTable = nullptr;        // FShopRow
	UPROPERTY(EditAnywhere, Category = "Data") UDataTable* InteractionTable = nullptr; // FInteractionRow
	UPROPERTY(EditAnywhere, Category = "Data") UDataTable* NpcTable = nullptr;         // FNpcSpawnRow

	/** Actor used per shop (e.g. BP_Shop with a sign/mesh). Gets ShopName/Color via tags if desired. */
	UPROPERTY(EditAnywhere, Category = "Classes") TSubclassOf<AActor> ShopClass;
	/** Actor that owns a UInteractableComponent (terminal/door/screen/vendor). */
	UPROPERTY(EditAnywhere, Category = "Classes") TSubclassOf<AActor> InteractionClass;
	/** Character used per NPC spawn (BP_NPC_Pedestrian). */
	UPROPERTY(EditAnywhere, Category = "Classes") TSubclassOf<ACharacter> PedestrianClass;

	UPROPERTY(EditAnywhere, Category = "Layout") float MetersToUU = 100.f;

	/** Press in the Details panel to populate the level from the DataTables. */
	UFUNCTION(CallInEditor, Category = "Build")
	void BuildCity();

	/** Removes everything spawned by the last BuildCity. */
	UFUNCTION(CallInEditor, Category = "Build")
	void ClearCity();

private:
	UPROPERTY() TArray<AActor*> Spawned;

	FVector ToWorld(float X_m, float Y_m, float Z_m) const;
};
