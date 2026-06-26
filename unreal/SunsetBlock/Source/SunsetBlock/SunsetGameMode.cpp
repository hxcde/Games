#include "SunsetGameMode.h"
#include "SunsetCharacter.h"

ASunsetGameMode::ASunsetGameMode()
{
	DefaultPawnClass = ASunsetCharacter::StaticClass();
	// Assign a Blueprint HUD/Controller in the BP child of this GameMode if needed.
}
