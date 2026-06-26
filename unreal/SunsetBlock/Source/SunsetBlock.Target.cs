using UnrealBuildTool;

public class SunsetBlockTarget : TargetRules
{
	public SunsetBlockTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;
		ExtraModuleNames.Add("SunsetBlock");
	}
}
