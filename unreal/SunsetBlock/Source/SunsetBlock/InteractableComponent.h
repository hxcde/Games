#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "InteractableComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnInteract, AActor*, Interactor);

/**
 * Drop this on any actor (shop terminal, door, vendor, ad screen) to make it
 * interactable. The player traces forward, finds the nearest one and calls
 * Interact(). Mirrors the prototype's prompt + dialogue-lines model.
 */
UCLASS(ClassGroup = (Sunset), meta = (BlueprintSpawnableComponent))
class SUNSETBLOCK_API UInteractableComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UInteractableComponent();

	/** Shown on the HUD when looked at, e.g. "Mit Händler reden". */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
	FText Prompt;

	/** Speaker label, e.g. "Old Hideo // Neo-Ramen". */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
	FText Who;

	/** Dialogue lines, shown one by one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
	TArray<FText> Lines;

	/** Max interaction distance in cm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction")
	float Range = 300.f;

	/** Broadcast when the player interacts. The HUD listens and shows the dialogue. */
	UPROPERTY(BlueprintAssignable, Category = "Interaction")
	FOnInteract OnInteract;

	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void Interact(AActor* Interactor);
};
