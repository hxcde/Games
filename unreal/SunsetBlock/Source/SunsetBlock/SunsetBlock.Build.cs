using UnrealBuildTool;

public class SunsetBlock : ModuleRules
{
	public SunsetBlock(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core", "CoreUObject", "Engine", "InputCore",
			"EnhancedInput"
		});

		// Optional: enable when the NVIDIA DLSS / Streamline plugin is installed.
		// PublicDependencyModuleNames.AddRange(new string[] { "DLSS", "DLSSBlueprint" });
	}
}
