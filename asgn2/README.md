# Grader Note - Blocky Animal Project

## Overview & Collaboration

This project implements the Blocky Animal assignment requirements for a 3D animated crab using WebGL.

The development was a collaborative effort:
* **Initial Setup:** Basic HTML/WebGL structure, shaders, initial model hierarchy, leg sliders, basic mouse rotation, animation toggle, and FPS counter were implemented by the student.
* **AI Assistance:** Gemini assisted with debugging rendering issues (Cube vertices, Cone drawing), fixing hierarchical transformations (claw tips), implementing the Shift+Click 'poke' animation (explosion), optimizing shape rendering performance (buffer creation), adding the third joint (pincers) with slider control, implementing more natural walk animation (body bob, claw sway), and adding the separate global Y-rotation slider.

## Key Features Implemented

* **Hierarchical Model:** Crab with >= 8 parts (body, eyes, multi-segment legs/claws) and >= 2 joint levels.
* **Primitives:** Uses `Cube` and `Cone` (for eyes).
* **Controls:**
    * Sliders for Leg Joint 1, Leg Joint 2, and Pincer Angle (3rd Joint).
    * Slider for Global Y-Rotation.
    * Slider and Mouse Drag for Camera View Rotation (X/Y).
* **Animation:**
    * Toggleable walk animation with body bob and claw sway.
    * Special "poke" animation (explosion) triggered by Shift+Click.
* **Performance:**
    * Optimized shape rendering (buffers created once).
    * FPS counter displayed.
* **Other:** Color applied per part, Reset button.

This implementation addresses the core requirements and incorporates several of the additional/harder features outlined in the assignment.
