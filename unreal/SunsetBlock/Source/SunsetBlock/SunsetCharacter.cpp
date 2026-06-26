#include "SunsetCharacter.h"
#include "InteractableComponent.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputActionValue.h"
#include "Engine/World.h"

ASunsetCharacter::ASunsetCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	GetCapsuleComponent()->InitCapsuleSize(40.f, 92.f);

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(GetCapsuleComponent());
	Camera->SetRelativeLocation(FVector(0.f, 0.f, 70.f)); // eye height ~1.6 m
	Camera->bUsePawnControlRotation = true;

	bUseControllerRotationYaw = true;

	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->MaxWalkSpeed = WalkSpeed;
	Move->MaxStepHeight = 45.f;          // reach kerbs / single steps cleanly
	Move->SetWalkableFloorAngle(50.f);   // ramps up to 50 degrees are walkable
	Move->bUseFlatBaseForFloorChecks = true;
}

void ASunsetCharacter::BeginPlay()
{
	Super::BeginPlay();

	if (APlayerController* PC = Cast<APlayerController>(GetController()))
	{
		if (auto* Subsys = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
		{
			if (MappingContext) { Subsys->AddMappingContext(MappingContext, 0); }
		}
	}
}

void ASunsetCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		if (MoveAction)     EIC->BindAction(MoveAction,     ETriggerEvent::Triggered, this, &ASunsetCharacter::Move);
		if (LookAction)     EIC->BindAction(LookAction,     ETriggerEvent::Triggered, this, &ASunsetCharacter::Look);
		if (JumpAction)     { EIC->BindAction(JumpAction, ETriggerEvent::Started, this, &ACharacter::Jump);
		                      EIC->BindAction(JumpAction, ETriggerEvent::Completed, this, &ACharacter::StopJumping); }
		if (SprintAction)   { EIC->BindAction(SprintAction, ETriggerEvent::Started, this, &ASunsetCharacter::StartSprint);
		                      EIC->BindAction(SprintAction, ETriggerEvent::Completed, this, &ASunsetCharacter::StopSprint); }
		if (InteractAction) EIC->BindAction(InteractAction, ETriggerEvent::Started, this, &ASunsetCharacter::DoInteract);
	}
}

void ASunsetCharacter::Move(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	if (!Controller) return;
	const FRotator YawRot(0.f, Controller->GetControlRotation().Yaw, 0.f);
	AddMovementInput(FRotationMatrix(YawRot).GetUnitAxis(EAxis::X), Axis.Y);
	AddMovementInput(FRotationMatrix(YawRot).GetUnitAxis(EAxis::Y), Axis.X);
}

void ASunsetCharacter::Look(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AddControllerYawInput(Axis.X);
	AddControllerPitchInput(-Axis.Y);
}

void ASunsetCharacter::StartSprint() { GetCharacterMovement()->MaxWalkSpeed = SprintSpeed; }
void ASunsetCharacter::StopSprint()  { GetCharacterMovement()->MaxWalkSpeed = WalkSpeed; }

void ASunsetCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	FocusedInteractable = TraceInteractable();
}

UInteractableComponent* ASunsetCharacter::TraceInteractable() const
{
	if (!Camera) return nullptr;
	const FVector Start = Camera->GetComponentLocation();
	const FVector End = Start + Camera->GetForwardVector() * InteractDistance;

	FHitResult Hit;
	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);
	if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params))
	{
		if (AActor* HitActor = Hit.GetActor())
		{
			return HitActor->FindComponentByClass<UInteractableComponent>();
		}
	}
	return nullptr;
}

void ASunsetCharacter::DoInteract()
{
	if (FocusedInteractable)
	{
		FocusedInteractable->Interact(this);
	}
}
