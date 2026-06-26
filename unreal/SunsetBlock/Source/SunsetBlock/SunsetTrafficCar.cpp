#include "SunsetTrafficCar.h"
#include "Components/SplineComponent.h"
#include "Components/StaticMeshComponent.h"

ASunsetTrafficCar::ASunsetTrafficCar()
{
	PrimaryActorTick.bCanEverTick = true;

	Route = CreateDefaultSubobject<USplineComponent>(TEXT("Route"));
	SetRootComponent(Route);

	Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Body"));
	Body->SetupAttachment(Route);
	Body->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Body->SetCollisionResponseToAllChannels(ECR_Block);
}

void ASunsetTrafficCar::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!Route || Route->GetNumberOfSplinePoints() < 2) return;

	const float Length = Route->GetSplineLength();
	Distance += Speed * DeltaSeconds;
	if (Distance > Length)
	{
		Distance = bLoop ? FMath::Fmod(Distance, Length) : Length;
	}

	const FVector Loc = Route->GetLocationAtDistanceAlongSpline(Distance, ESplineCoordinateSpace::World);
	const FRotator Rot = Route->GetRotationAtDistanceAlongSpline(Distance, ESplineCoordinateSpace::World);
	Body->SetWorldLocationAndRotation(Loc, FRotator(0.f, Rot.Yaw, 0.f));
}
