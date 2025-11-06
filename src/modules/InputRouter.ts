/**
 * Input Router - Routes input events to appropriate handlers
 */

export class InputRouter {
  constructor() {
    this.setupGlobalCallbacks();
  }

  /**
   * Setup global callback functions for input routing
   */
  private setupGlobalCallbacks(): void {
    // Define global callback for processing left mouse button press
    (globalThis as any).processLeftPress = () => {
      this.processLeftPress();
    };

    // Define global callback for processing right mouse button press
    (globalThis as any).processRightPress = () => {
      this.processRightPress();
    };

    // Define global callback for handling key press events
    (globalThis as any).processKeyPress = (key: string) => {
      this.processKeyPress(key);
    };

    (globalThis as any).processKeyRelease = (key: string) => {
      this.processKeyRelease(key);
    };

    (globalThis as any).processLeftTouchpadValueChange = (x: number, y: number) => {
      this.processLeftTouchpadValueChange(x, y);
    };

    (globalThis as any).processRightTouchpadValueChange = (x: number, y: number) => {
      this.processRightTouchpadValueChange(x, y);
    };

    (globalThis as any).processLeftStickValueChange = (x: number, y: number) => {
      this.processLeftStickValueChange(x, y);
    };

    (globalThis as any).processRightStickValueChange = (x: number, y: number) => {
      this.processRightStickValueChange(x, y);
    };

    (globalThis as any).processLeftPrimaryPress = () => {
      this.processLeftPrimaryPress();
    };

    (globalThis as any).processRightPrimaryPress = () => {
      this.processRightPrimaryPress();
    };

    (globalThis as any).processLeftPrimaryRelease = () => {
      this.processLeftPrimaryRelease();
    };

    (globalThis as any).processRightPrimaryRelease = () => {
      this.processRightPrimaryRelease();
    };

    (globalThis as any).processLeftSecondaryPress = () => {
      this.processLeftSecondaryPress();
    };

    (globalThis as any).processRightSecondaryPress = () => {
      this.processRightSecondaryPress();
    };

    (globalThis as any).processLeftSecondaryRelease = () => {
      this.processLeftSecondaryRelease();
    };

    (globalThis as any).processRightSecondaryRelease = () => {
      this.processRightSecondaryRelease();
    };

    (globalThis as any).processLeftTouchpadPress = () => {
      this.processLeftTouchpadPress();
    };

    (globalThis as any).processRightTouchpadPress = () => {
      this.processRightTouchpadPress();
    };

    (globalThis as any).processLeftTriggerPress = () => {
      this.processLeftTriggerPress();
    };

    (globalThis as any).processRightTriggerPress = () => {
      this.processRightTriggerPress();
    };

    (globalThis as any).processLeftTriggerRelease = () => {
      this.processLeftTriggerRelease();
    };

    (globalThis as any).processRightTriggerRelease = () => {
      this.processRightTriggerRelease();
    };

    (globalThis as any).processLeftGripPress = () => {
      this.processLeftGripPress();
    };

    (globalThis as any).processRightGripPress = () => {
      this.processRightGripPress();
    };
  }

  /**
   * Process left press
   */
  processLeftPress(): void {
    (globalThis as any).handleLeftPress();
  }

  /**
   * Process right press
   */
  processRightPress(): void {
    (globalThis as any).handleRightPress();
  }

  /**
   * Process key events
   */
  processKeyPress(key: string): void {
    var thirdPersonCharacterController = Context.GetContext("THIRD_PERSON_CHARACTER_CONTROLLER");
    var entityPlacementComponent = Context.GetContext("ENTITY_PLACEMENT_COMPONENT");
    if (key === "r") {
        entityPlacementComponent.ToggleOrientation();
    }
    else if (key === "q") {
        thirdPersonCharacterController.currentMotion.y = 1;
    }
    else if (key === "z") {
        thirdPersonCharacterController.currentMotion.y = -1;
    }
    else if (key == "e") {
        (globalThis as any).startVehicleEngine();
    }
    else if (key == "w") {
        (globalThis as any).moveVehicleForward();
    }
    else if (key == "s") {
        (globalThis as any).moveVehicleBackward();
    }
    else if (key == "a") {
        (globalThis as any).steerVehicleLeft();
    }
    else if (key == "d") {
        (globalThis as any).steerVehicleRight();
    }
    else if (key == "i") {
        (globalThis as any).performRotate("z", false);
    }
    else if (key == "j") {
        (globalThis as any).performRotate("y", true);
    }
    else if (key == "k") {
        (globalThis as any).performRotate("z", true);
    }
    else if (key == "l") {
        (globalThis as any).performRotate("y", false);
    }
    else if (key == "x") {
        (globalThis as any).exitVehicle();
    }
  }

  /**
   * Process key release events
   */
  processKeyRelease(key: string): void {
    var thirdPersonCharacterController = Context.GetContext("THIRD_PERSON_CHARACTER_CONTROLLER");
    if (key === "q") {
        thirdPersonCharacterController.currentMotion.y = 0;
    }
    else if (key === "z") {
        thirdPersonCharacterController.currentMotion.y = 0;
    }
    else if (key == "w") {
        (globalThis as any).stopMovingVehicle();
    }
    else if (key == "s") {
        (globalThis as any).stopMovingVehicle();
    }
    else if (key == "a") {
        (globalThis as any).stopSteeringVehicle();
    }
    else if (key == "d") {
        (globalThis as any).stopSteeringVehicle();
    }
  }

  /**
   * Process left touchpad value change events
   */
  processLeftTouchpadValueChange(x: number, y: number): void {
    Logging.Log('Left touchpad value changed: ' + x + ', ' + y);
  }

  /**
   * Process right touchpad value change events
   */
  processRightTouchpadValueChange(x: number, y: number): void {
    Logging.Log('Right touchpad value changed: ' + x + ', ' + y);
  }

  /**
   * Process left stick value change events
   */
  processLeftStickValueChange(x: number, y: number): void {
    var previousLeftStickValue = WorldStorage.GetItem("LEFT-STICK-VALUE-X") as string;
    if (previousLeftStickValue == null || previousLeftStickValue == undefined
      || previousLeftStickValue == "") {
        previousLeftStickValue = "0";
    }
    var currentTriggerState = WorldStorage.GetItem("LEFT-TRIGGER-STATE");
    if (currentTriggerState == "PRESSED") {
        if (previousLeftStickValue == "0") {
            if (x < -0.5) {
                (globalThis as any).messageEditToolbar('TOOLBAR_BUTTON_NAVIGATE_LEFT');
            }
            else if (x > 0.5) {
                (globalThis as any).messageEditToolbar('TOOLBAR_BUTTON_NAVIGATE_RIGHT');
            }
        }
    }
    WorldStorage.SetItem("LEFT-STICK-VALUE-X", x.toString());
    WorldStorage.SetItem("LEFT-STICK-VALUE-Y", y.toString());
  }

  /**
   * Process right stick value change events
   */
  processRightStickValueChange(x: number, y: number): void {
    var placing = WorldStorage.GetItem("ENTITY-BEING-PLACED");
    if (placing != "TRUE") {
        return;
    }

    var previousRightStickValueX = WorldStorage.GetItem("RIGHT-STICK-VALUE-X") as string;
    if (previousRightStickValueX == null || previousRightStickValueX == undefined
      || previousRightStickValueX == "") {
        previousRightStickValueX = "0";
    }

    var previousRightStickValueY = WorldStorage.GetItem("RIGHT-STICK-VALUE-Y") as string;
    if (previousRightStickValueY == null || previousRightStickValueY == undefined
      || previousRightStickValueY == "") {
        previousRightStickValueY = "0";
    }

    if (x < -0.5 && parseFloat(previousRightStickValueX) >= -0.5) {
        (globalThis as any).performRotate("y", true);
    }
    else if (x > 0.5 && parseFloat(previousRightStickValueX) <= 0.5) {
        (globalThis as any).performRotate("y", false);
    }
    else if (y < -0.5 && parseFloat(previousRightStickValueY) >= -0.5) {
        (globalThis as any).performRotate("z", true);
    }
    else if (y > 0.5 && parseFloat(previousRightStickValueY) <= 0.5) {
        (globalThis as any).performRotate("z", false);
    }
    WorldStorage.SetItem("RIGHT-STICK-VALUE-X", x.toString());
    WorldStorage.SetItem("RIGHT-STICK-VALUE-Y", y.toString());
  }

  /**
   * Process left primary press events
   */
  processLeftPrimaryPress(): void {
    var currentTriggerState = WorldStorage.GetItem("LEFT-TRIGGER-STATE");
    if (currentTriggerState == "PRESSED") {
        // console and settings
    }
    else {
      (globalThis as any).messageEditToolbar('CONTEXT_MENU_TOGGLE_MENU');
    }
  }

  /**
   * Process right primary press events
   */
  processRightPrimaryPress(): void {
    WorldStorage.SetItem("RIGHT-PRIMARY-STATE", "PRESSED");
    //MW_Input_VR_ToggleVRMenu();
  }

  /**
   * Process left primary release events
   */
  processLeftPrimaryRelease(): void {

  }

  /**
   * Process right primary release events
   */
  processRightPrimaryRelease(): void {
    WorldStorage.SetItem("RIGHT-PRIMARY-STATE", "RELEASED");
  }

  /**
   * Process left secondary press events
   */
  processLeftSecondaryPress(): void {

  }

  /**
   * Process right secondary press events
   */
  processRightSecondaryPress(): void {

  }

  /**
   * Process left secondary release events
   */
  processLeftSecondaryRelease(): void {

  }

  /**
   * Process right secondary release events
   */
  processRightSecondaryRelease(): void {

  }

  /**
   * Process left touchpad press events
   */
  processLeftTouchpadPress(): void {
    var currentLocomotion = WorldStorage.GetItem("LEFT-TOUCHPAD-LOCOMOTION");
    if (currentLocomotion == null || currentLocomotion == "") {Logging.Log("1");
        currentLocomotion = "MOVE-CONTROL";
    }

    if (currentLocomotion == "MOVE-CONTROL") {Logging.Log("2");
        WorldStorage.SetItem("LEFT-TOUCHPAD-LOCOMOTION", "TELEPORT");
        Input.leftVRPointerMode = Input.VRPointerMode.Teleport;
        Input.joystickMotionEnabled = false;
    }
    else if (currentLocomotion == "TELEPORT") {Logging.Log("3");
        WorldStorage.SetItem("LEFT-TOUCHPAD-LOCOMOTION", "MOVE-CONTROL");
        Input.leftVRPointerMode = Input.VRPointerMode.None;
        Input.joystickMotionEnabled = true;
    }
  }

  /**
   * Process right touchpad press events
   */
  processRightTouchpadPress(): void {

  }

  /**
   * Process left trigger press events
   */
  processLeftTriggerPress(): void {
    WorldStorage.SetItem("LEFT-TRIGGER-STATE", "PRESSED");
    Input.joystickMotionEnabled = false;
  }

  /**
   * Process right trigger press events
   */
  processRightTriggerPress(): void {
    WorldStorage.SetItem("RIGHT-TRIGGER-STATE", "PRESSED");
    (globalThis as any).processLeftTriggerPress();
  }

  /**
   * Process left trigger release events
   */
  processLeftTriggerRelease(): void {
    WorldStorage.SetItem("LEFT-TRIGGER-STATE", "RELEASED");
    var touchpadLocomotion = WorldStorage.GetItem("LEFT-TOUCHPAD-LOCOMOTION");
    if (touchpadLocomotion == null || touchpadLocomotion == "MOVE-CONTROL") {
        Input.joystickMotionEnabled = true;
    }
  }

  /**
   * Process right trigger release events
   */
  processRightTriggerRelease(): void {
    WorldStorage.SetItem("RIGHT-TRIGGER-STATE", "RELEASED");
  }

  /**
   * Process left grip press events
   */
  processLeftGripPress(): void {

  }

  /**
   * Process right grip press events
   */
  processRightGripPress(): void {
    (globalThis as any).processGripPress();
  }

  /**
   * Initialize input listeners
   */
  initialize(): void {
    //this.setupEventListeners();
    Logging.Log('InputRouter initialized');
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    //this.handlers.clear();
  }
}
