#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "SunsetGameMode.generated.h"

/** Default game mode: spawns ASunsetCharacter as the player pawn. */
UCLASS()
class SUNSETBLOCK_API ASunsetGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ASunsetGameMode();
};
