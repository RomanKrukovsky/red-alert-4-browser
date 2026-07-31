# RA4 Browser RTS — Known Issues & Limitations

**Document Date**: July 31, 2026

---

## Minor Known Issues (Post-Vertical Slice Backlog)

| ID | Priority | Area | Description | Mitigation / Planned Fix |
| :--- | :---: | :--- | :--- | :--- |
| **ISSUE-01** | Minor | Renderer | Geometric primitive mesh proxies (cubes/cylinders) used for units instead of full GLTF models with skeletal animations. | Integrate GLTF Asset Registry in Phase 2. |
| **ISSUE-02** | Minor | UI | Minimap canvas uses simplified 2D dot rendering. | Add heightmap terrain background texture in Phase 2. |
| **ISSUE-03** | Minor | Audio | Sound effects currently use synthetic WebAudio tones instead of voice actor `.wav` / `.ogg` clips. | Wire physical audio asset folder in Phase 2. |
| **ISSUE-04** | Minor | AI | AI building placement searches fixed grid offsets around HQ. | Implement dynamic grid clearance evaluator in Phase 2. |
