import theatre from "@theatre/core";
const { getProject } = theatre;

export function createTimeline() {
  const values = {
    x: [1.75, -1.85, 1.9, 0],
    y: [0.15, 0.25, 0.1, 0.65],
    z: [0, 0, 0.4, -1],
    turn: [0, 1.65, 3.5, 5.5],
    tilt: [0.12, -0.35, 0.4, -0.2],
    spread: [0.7, 1.55, 0.92, 1.7],
    cameraX: [0, -0.4, 0.3, 0],
    cameraY: [0.55, 0.9, 0.15, 1.2],
    cameraZ: [8.5, 8.2, 8.4, 10],
  };
  const trackData = {},
    trackIdByPropPath = {};
  for (const [key, entries] of Object.entries(values)) {
    trackIdByPropPath[JSON.stringify([key])] = key;
    trackData[key] = {
      type: "BasicKeyframedTrack",
      keyframes: entries.map((value, position) => ({
        id: `${key}-${position}`,
        position,
        value,
        handles: [0.5, 1, 0.5, 0],
        connectedRight: true,
        type: "bezier",
      })),
    };
  }
  const project = getProject("Morrow", {
    state: {
      definitionVersion: "0.4.0",
      revisionHistory: [],
      sheetsById: {
        Journey: {
          staticOverrides: { byObject: {} },
          sequence: {
            type: "PositionalSequence",
            length: 3,
            subUnitsPerUnit: 30,
            tracksByObject: { Rig: { trackData, trackIdByPropPath } },
          },
        },
      },
    },
  });
  const sheet = project.sheet("Journey");
  const rig = sheet.object(
    "Rig",
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value[0]]),
    ),
  );
  return { project, sheet, rig };
}
