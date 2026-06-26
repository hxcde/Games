using UnrealBuildTool;

public class SunsetBlockEditorTarget : TargetRules
{
	public SunsetBlockEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;
		ExtraModuleNames.Add("SunsetBlock");
	}
}
