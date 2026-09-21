# Detailed models and realistic surfaces

Default to convincing material realism, including for humorous meme characters. Ask about the developer's preferred art direction and reference images; preserve an explicit cartoon, low-poly or other style. Realism means coherent shapes, surface response, lighting and scale, not maximum polygon or texture counts.

## Build a visual target before expanding the world

Finish one representative character or vehicle and a small environment patch first. Show a desktop and phone screenshot for the developer to assess. A hero should have a deliberate silhouette and secondary details: beveled edges, joints, visor, seams, soles, wheel hubs, tread, lamps or trim as appropriate. Avoid a shiny box standing in for a finished character or car. Procedural modeling is valid when the geometry is deliberately detailed; label blockout assets while replacing them.

For supplied/licensed GLB assets, inspect units, pivot, orientation, normals, UVs, texture bindings and animation clips. Retarget or choose actual walk/run/idle clips; do not slide a static character and call it animation. For custom articulated models, animate parent joints and preserve their transforms when batching rigid submeshes. Confirm ownership/licence for characters and sound as well as textures.

## PBR surfaces that read as real materials

- Use coherent base-color, normal and roughness maps from the same surface set. Add metalness or AO where appropriate. Prefer physical or measured-looking detail over random noise applied to every object.
- Real wood needs grain at a believable scale and direction; asphalt needs aggregate with subtle height variation; rubber should be rough; glass/paint and metal need different reflection responses. Bevel silhouette edges in geometry, not just a normal map.
- Use sRGB for base color/emissive textures, linear/no color space for normal, roughness, metalness and AO. Check OpenGL versus DirectX normal orientation. Repetition must match world units rather than stretch one tile across a city.
- Use MeshStandardMaterial or MeshPhysicalMaterial where their extra features are visible. Clearcoat suits painted bodywork; avoid unnecessary transmission/refraction on every small prop. Realistic stylized glazing can use a dark reflective material on constrained phones.
- Use an environment map/PMREM with a soft key and restrained fill/rim light. A bounded shadow map or baked contact shadow should ground objects. Tune exposure/tone mapping and compare real light/dark surfaces; do not hide missing detail with bloom.
- Bundle permitted texture files on the game's host with provenance/author/licence. Poly Haven and ambientCG offer CC0 assets; verify the specific asset and distribution terms. Avoid runtime hotlinks or silent placeholder textures after a failed request.

## Realistic and usable on a phone

Start with 1K material sets and 2K only for a visibly important hero surface; justify higher resolutions with an actual close-up. Transfer size is not GPU texture memory: count decoded dimensions, mipmaps and compressed-format support. Use supported KTX2/Basis assets when worthwhile, or optimized WebP/JPEG with a GPU budget. Atlas/reuse textures and materials; batch rigid geometry or instance repeated props without baking away animated joints.

For a small scene, a useful starting budget is a DPR cap around 1–1.5, one 1024px shadow-casting light, limited physical materials and no obligatory postprocessing chain. These are starting points, not certified performance. Measure renderer draw calls, triangle count, load bytes and frame time on target devices; offer lower shadow/texture quality when needed. Keep readable controls and a stable camera ahead of visual effects.

Pause the animation loop when offscreen/hidden. Honor reduced motion by rendering a still frame, not running a redundant continuous loop. Dispose geometries, materials, every texture, environment targets and shadow targets on scene changes. Ignore/dispose late async loads after teardown and show a useful loading/failure state.

## Visual acceptance

Check all concept/game modes at desktop and 390px portrait/phone landscape. Inspect texture loading, UV seams, grain scale, normal strength, shadows under feet/tires, specular highlights, animation/contact, camera clipping and silhouette readability. Switch modes repeatedly and test background/foreground. Reduced-motion mode should stay still. Report hardware performance as measured or untested; a screenshot does not establish mobile FPS.

The finished delivery should include the playable loop **and** the visual pass. Never describe a primitive blockout or a rendered concept alone as a finished realistic game.

Sources: https://threejs.org/manual/pages/color-management.html ; https://threejs.org/manual/pages/textures.html ; https://threejs.org/docs/pages/MeshStandardMaterial.html ; https://threejs.org/docs/pages/MeshPhysicalMaterial.html ; https://polyhaven.com/license ; https://docs.ambientcg.com/license/
