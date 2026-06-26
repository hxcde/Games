#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "SunsetCharacter.generated.h"

class UCameraComponent;
class UInputMappingContext;
class UInputAction;
class UInteractableComponent;
struct FInputActionValue;

/**
 * First-person player character for the vertical slice.
 * Walk/sprint/look via Enhanced Input + a forward trace that drives
 * UInteractableComponent (shops, terminal, door, vendor).
 * CharacterMovement handles slopes/steps so the prototype's "can't reach a
 * level" bug is solved by real collision + MaxStepHeight (no raycast hacks).
 */
UCLASS()
class SUNSETBLOCK_API ASunsetCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	ASunsetCharacter();

	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
	UCameraComponent* Camera;

	// --- Enhanced Input assets (assign in the BP_PlayerCharacter defaults) ---
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Input") UInputMappingContext* MappingContext;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Input") UInputAction* MoveAction;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Input") UInputAction* LookAction;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Input") UInputAction* JumpAction;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Input") UInputAction* SprintAction;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Input") UInputAction* InteractAction;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Move") float WalkSpeed = 400.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Move") float SprintSpeed = 760.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction") float InteractDistance = 300.f;

	/** The interactable currently under the crosshair (drive the HUD prompt off this). */
	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	UInteractableComponent* FocusedInteractable = nullptr;

protected:
	virtual void BeginPlay() override;

	void Move(const FInputActionValue& Value);
	void Look(const FInputActionValue& Value);
	void StartSprint();
	void StopSprint();
	void DoInteract();

	UInteractableComponent* TraceInteractable() const;
};
