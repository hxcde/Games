#include "SunsetCitySpawner.h"
#include "SunsetTableRows.h"
#include "InteractableComponent.h"
#include "GameFramework/Character.h"
#include "Engine/World.h"

ASunsetCitySpawner::ASunsetCitySpawner()
{
	PrimaryActorTick.bCanEverTick = false;
}

FVector ASunsetCitySpawner::ToWorld(float X_m, float Y_m, float Z_m) const
{
	// prototype (X,Z) horizontal, Y up -> Unreal (Z-up). See header for convention.
	const FVector Local(-Z_m * MetersToUU, X_m * MetersToUU, Y_m * MetersToUU);
	return GetActorLocation() + Local;
}

void ASunsetCitySpawner::ClearCity()
{
	for (AActor* A : Spawned)
	{
		if (IsValid(A)) A->Destroy();
	}
	Spawned.Reset();
}

void ASunsetCitySpawner::BuildCity()
{
	UWorld* World = GetWorld();
	if (!World) return;

	ClearCity();

	// --- Shops ---
	if (ShopTable && ShopClass)
	{
		TArray<FShopRow*> Rows;
		ShopTable->GetAllRows<FShopRow>(TEXT("BuildCity:Shops"), Rows);
		for (const FShopRow* R : Rows)
		{
			if (!R) continue;
			const FVector Loc = ToWorld(R->X_m, 0.f, R->Z_m);
			const FRotator Rot(0.f, R->FaceNormalX < 0.f ? 90.f : -90.f, 0.f); // face the street
			if (AActor* A = World->SpawnActor<AActor>(ShopClass, Loc, Rot))
			{
				A->Tags.Add(FName(*R->ShopName));
				A->Tags.Add(FName(*R->Type));
				Spawned.Add(A);
			}
		}
	}

	// --- Interaction stations ---
	if (InteractionTable && InteractionClass)
	{
		TArray<FInteractionRow*> Rows;
		InteractionTable->GetAllRows<FInteractionRow>(TEXT("BuildCity:Interactions"), Rows);
		for (const FInteractionRow* R : Rows)
		{
			if (!R) continue;
			const FVector Loc = ToWorld(R->X_m, R->Y_m, R->Z_m);
			if (AActor* A = World->SpawnActor<AActor>(InteractionClass, Loc, FRotator::ZeroRotator))
			{
				if (UInteractableComponent* IC = A->FindComponentByClass<UInteractableComponent>())
				{
					IC->Who = FText::FromString(R->Who);
					IC->Prompt = FText::FromString(R->Prompt);
					IC->Lines.Reset();
					if (!R->Line1.IsEmpty()) IC->Lines.Add(FText::FromString(R->Line1));
					if (!R->Line2.IsEmpty()) IC->Lines.Add(FText::FromString(R->Line2));
				}
				Spawned.Add(A);
			}
		}
	}

	// --- NPCs ---
	if (NpcTable && PedestrianClass)
	{
		TArray<FNpcSpawnRow*> Rows;
		NpcTable->GetAllRows<FNpcSpawnRow>(TEXT("BuildCity:NPCs"), Rows);
		for (const FNpcSpawnRow* R : Rows)
		{
			if (!R) continue;
			const FVector Loc = ToWorld(R->X_m, 0.f, R->Z_m);
			if (AActor* A = World->SpawnActor<ACharacter>(PedestrianClass, Loc, FRotator::ZeroRotator))
			{
				A->Tags.Add(FName(*R->Role));
				Spawned.Add(A);
			}
		}
	}
}
