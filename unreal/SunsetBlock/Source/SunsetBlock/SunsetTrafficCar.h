#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SunsetTrafficCar.generated.h"

class USplineComponent;
class UStaticMeshComponent;

/**
 * A car that drives along its own editable spline (the route).
 * Place in the level, shape the spline along a street, assign a car mesh.
 * No per-car dynamic lights (emissive materials only) — see migration plan.
 */
UCLASS()
class SUNSETBLOCK_API ASunsetTrafficCar : public AActor
{
	GENERATED_BODY()

public:
	ASunsetTrafficCar();
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Traffic")
	USplineComponent* Route;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Traffic")
	UStaticMeshComponent* Body;

	/** Drive speed in cm/s. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Traffic")
	float Speed = 600.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Traffic")
	bool bLoop = true;

private:
	float Distance = 0.f;
};
