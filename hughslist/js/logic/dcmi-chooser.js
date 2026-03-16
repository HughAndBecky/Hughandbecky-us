// logic/dcmi-chooser.js
// ---------------------------------------------
// Pure logic for the DCMIType chooser
// ---------------------------------------------

export const dcmiTree = {
  Q0: {
    label: "Start",
    question: "Is the resource composed of sub-resources?",
    children: { Yes: "Collection", No: "Q2" }
  },

  Collection: { stop: true, label: "Collection" },

  Q2: {
    label: "Textual?",
    question: "Is the resource primarily textual?",
    children: { Yes: "G", No: "Q3" }
  },

  Q3: {
    label: "Visual?",
    question: "Is the resource primarily visual?",
    children: { Yes: "Q3_1", No: "O" }
  },

  Q3_1: {
    label: "Timeline?",
    question: "Does the work have a timeline or chronological nature?",
    children: { Yes: "MovingImage", No: "StillImage", Uncertain: "Image" }
  },

  StillImage: { stop: true, label: "StillImage" },
  Image: { stop: true, label: "Image" },
  MovingImage: { stop: true, label: "MovingImage" },

  G: {
    label: "Table-like?",
    question: "Is the content arranged in a table-like structure?",
    children: { Yes: "Dataset", No: "K" }
  },

  Dataset: { stop: true, label: "Dataset" },

  K: {
    label: "Code?",
    question: "Is the resource composed of code that runs on a machine?",
    children: { Yes: "Software", No: "Text" }
  },

  Software: { stop: true, label: "Software" },
  Text: { stop: true, label: "Text" },

  O: {
    label: "Audible?",
    question: "Is the resource primarily audible?",
    children: { Yes: "Sound", No: "P" }
  },

  Sound: { stop: true, label: "Sound" },

  P: {
    label: "Physical?",
    question: "Does the resource have physical characteristics?",
    children: { Yes: "PhysicalObject", No: "R" }
  },

  PhysicalObject: { stop: true, label: "PhysicalObject" },

  R: {
    label: "Time-oriented?",
    question: "Is the resource time-oriented with a start and stop point?",
    children: { Yes: "Event", No: "U" }
  },

  Event: { stop: true, label: "Event" },

  U: {
    label: "Repeated action?",
    question: "Does the resource repeatedly act upon different information resources?",
    children: { Yes: "Service", No: "InteractiveResource" }
  },

  Service: { stop: true, label: "Service" },
  InteractiveResource: { stop: true, label: "InteractiveResource" }
};

// ---------------------------------------------
// All DCMI types (for pill board)
// ---------------------------------------------
export const allTypes = [
  "Text", "Image", "StillImage", "MovingImage", "Sound",
  "Dataset", "Software", "Collection", "Event",
  "PhysicalObject", "Service", "InteractiveResource"
];

// ---------------------------------------------
// Elimination rules
// ---------------------------------------------
export const eliminationRules = {
  Q0: {
    Yes: [
      "Text","Image","StillImage","MovingImage","Sound",
      "Dataset","Software","Event","PhysicalObject",
      "Service","InteractiveResource"
    ],
    No: ["Collection"]
  },

  Q2: {
    Yes: [
      "Image","StillImage","MovingImage","Sound",
      "Event","PhysicalObject","Service","InteractiveResource"
    ],
    No: ["Text","Dataset","Software"]
  },

  Q3: {
    Yes: ["Text","Sound","Dataset","Software","Event","PhysicalObject","Service","InteractiveResource"],
    No: ["Image","StillImage","MovingImage"]
  },

  Q3_1: {
    Yes: ["StillImage","Image"],
    No: ["MovingImage"],
    Uncertain: ["StillImage","MovingImage"]
  },

  G: {
    Yes: ["Text","Software","Sound","Image","StillImage","MovingImage","Event","PhysicalObject","Service","InteractiveResource"],
    No: ["Dataset"]
  },

  K: {
    Yes: ["Text"],
    No: ["Software"]
  },

  O: {
    Yes: ["Text","Image","StillImage","MovingImage","Dataset","Software","Event","PhysicalObject","Service","InteractiveResource"],
    No: ["Sound"]
  },

  P: {
    Yes: ["Event","Service","InteractiveResource","Dataset","Software","Text","Image","StillImage","MovingImage","Sound"],
    No: ["PhysicalObject"]
  },

  R: {
    Yes: ["Service","InteractiveResource","Dataset","Software","Text","Image","StillImage","MovingImage","Sound","PhysicalObject"],
    No: ["Event"]
  },

  U: {
    Yes: ["InteractiveResource"],
    No: ["Service"]
  }
};
