# Liquid Glass web adaptation

Source: https://github.com/sdegenaar/liquid_glass_widgets (MIT).

Inspected actual implementation: lib/src/engine/liquid_glass_settings.dart (separate tinted body and rim/specular treatment, saturation 1.4), lib/theme/glass_interaction_settings.dart (theme-level press interaction), lib/utils/glass_spring.dart (150 ms interactive and 500 ms smooth presets), and widgets/interactive/glass_button.dart (press scale and glow).

src/liquid-glass.css adapts the material separation, saturation choice, shared interaction timing, and accessibility/performance fallbacks into native CSS. It does not install or execute Dart, copy Flutter widgets, port the spring solver, or reproduce the toolkit's optical refraction shaders. CSS transitions approximate motion; they are not its physics engine. Body colors and restrained 0.98 press scale are project-specific for compact mobile controls. Backdrop blur is limited to Home surfaces and dialogs; camera and inventory rows avoid stacked blur.

Upstream MIT license and third-party notices are shipped under public/licenses. Current app copy, data, currency, layout, brand assets and customer PDF rendering are not taken from the concept image. No generated figures are used.
