// TypeScript definitions for WebVerse Runtime JavaScript APIs
// Project: WebVerse Runtime
// Definitions by: WebVerse Copilot

/**
 * WebVerse Runtime JavaScript API Type Definitions
 * 
 * This file provides TypeScript definitions for all APIs exposed by the
 * WebVerse Runtime's JavascriptHandler. These APIs are available globally
 * when scripts are executed within the WebVerse environment.
 * 
 * For more information, see:
 * https://five-squared-interactive.github.io/World-APIs/
 */

// ============================================================================
// World Types
// ============================================================================

/**
 * Class for an RGBA color.
 */
declare class Color {
    /** Red component, from 0-255. */
    r: number;
    /** Green component, from 0-255. */
    g: number;
    /** Blue component, from 0-255. */
    b: number;
    /** Alpha component, from 0-255. */
    a: number;

    /** Returns the color black (RGBA: 0, 0, 0, 1). */
    static readonly black: Color;
    /** Returns the color blue (RGBA: 0, 0, 1, 1). */
    static readonly blue: Color;
    /** Returns the color clear (RGBA: 0, 0, 0, 0). */
    static readonly clear: Color;
    /** Returns the color cyan (RGBA: 0, 1, 1, 1). */
    static readonly cyan: Color;
    /** Returns the color gray (RGBA: 0.5, 0.5, 0.5, 1). */
    static readonly gray: Color;
    /** Returns the color green (RGBA: 0, 1, 0, 1). */
    static readonly green: Color;
    /** Returns the color grey (RGBA: 0.5, 0.5, 0.5, 1). */
    static readonly grey: Color;
    /** Returns the color magenta (RGBA: 1, 0, 1, 1). */
    static readonly magenta: Color;
    /** Returns the color red (RGBA: 1, 0, 0, 1). */
    static readonly red: Color;
    /** Returns the color white (RGBA: 1, 1, 1, 1). */
    static readonly white: Color;
    /** Returns the color yellow (RGBA: 1, 0.92, 0.016, 1). */
    static readonly yellow: Color;

    /**
     * Constructor for a Color.
     * @param r Red component.
     * @param g Green component.
     * @param b Blue component.
     * @param a Alpha component.
     */
    constructor(r: number, g: number, b: number, a: number);
}

/**
 * Struct for raycast hit information.
 */
declare interface RaycastHitInfo {
    /** Entity that was hit. */
    entity: BaseEntity | null;
    /** Origin from which the ray was cast. */
    origin: Vector3;
    /** Point (in world coordinates) at which entity was hit. */
    hitPoint: Vector3;
    /** Normal of the hit point. */
    hitPointNormal: Vector3;
}

/**
 * Struct for a transform containing position, rotation, and scale.
 */
declare interface Transform {
    /** Position of the transform. */
    position: Vector3;
    /** Rotation of the transform. */
    rotation: Quaternion;
    /** Scale of the transform. */
    scale: Vector3;
}

/**
 * Class for a 2-dimensional vector.
 */
declare class Vector2 {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Magnitude of the vector. */
    readonly magnitude: number;
    /** Squared magnitude of the vector. */
    readonly squaredMagnitude: number;

    /** Constructor for a Vector2. */
    constructor();
    /**
     * Constructor for a Vector2.
     * @param x X component.
     * @param y Y component.
     */
    constructor(x: number, y: number);

    /** Get a down (0, -1) vector. */
    static readonly down: Vector2;
    /** Get an up (0, 1) vector. */
    static readonly up: Vector2;
    /** Get a left (-1, 0) vector. */
    static readonly left: Vector2;
    /** Get a right (1, 0) vector. */
    static readonly right: Vector2;
    /** Get a vector with both components set to 0. */
    static readonly zero: Vector2;
    /** Get a vector with both components set to 1. */
    static readonly one: Vector2;
    /** Get a vector with both components set to +infinity. */
    static readonly positiveInfinity: Vector2;
    /** Get a vector with both components set to -infinity. */
    static readonly negativeInfinity: Vector2;

    /**
     * Get the angle between two Vector2s.
     * @param vector1 First Vector2.
     * @param vector2 Second Vector2.
     * @returns The angle between the two vectors.
     */
    static GetAngle(vector1: Vector2, vector2: Vector2): number;

    /**
     * Get a Vector2 clamped to a certain length.
     * @param vector Vector2 to clamp.
     * @param maxLength Maximum length for the Vector2.
     * @returns A Vector2 clamped to a certain length.
     */
    static GetClampedVector2(vector: Vector2, maxLength: number): Vector2;

    /**
     * Get the distance between two Vector2s.
     * @param vector1 First Vector2.
     * @param vector2 Second Vector2.
     * @returns The distance between two Vector2s.
     */
    static GetDistance(vector1: Vector2, vector2: Vector2): number;

    /**
     * Get the dot product between two Vector2s.
     * @param leftHand Left hand Vector2.
     * @param rightHand Right hand Vector2.
     * @returns The dot product between two Vector2s.
     */
    static GetDotProduct(leftHand: Vector2, rightHand: Vector2): number;

    /**
     * Linearly interpolate between two Vector2s percentage-wise.
     * @param vector1 First Vector2.
     * @param vector2 Second Vector2.
     * @param percent Percent between first and second Vector2.
     * @returns A linearly interpolated Vector2 between the two Vector2s.
     */
    static LinearlyInterpolatePercent(vector1: Vector2, vector2: Vector2, percent: number): Vector2;

    /**
     * Linearly interpolate between two Vector2s distance-wise.
     * @param vector1 First Vector2.
     * @param vector2 Second Vector2.
     * @param maxDistance Maximum distance between first and second Vector2.
     * @returns A linearly interpolated Vector2 between the two Vector2s.
     */
    static LinearlyInterpolate(vector1: Vector2, vector2: Vector2, maxDistance: number): Vector2;

    /**
     * Get the minimum of two Vector2s.
     * @param vector1 First Vector2.
     * @param vector2 Second Vector2.
     * @returns The minimum of the two Vector2s.
     */
    static GetMin(vector1: Vector2, vector2: Vector2): Vector2;

    /**
     * Get the maximum of two Vector2s.
     * @param vector1 First Vector2.
     * @param vector2 Second Vector2.
     * @returns The maximum of the two Vector2s.
     */
    static GetMax(vector1: Vector2, vector2: Vector2): Vector2;

    /**
     * Get a perpendicular vector to the provided vector.
     * @param vector Vector for which to get perpendicular.
     * @returns A perpendicular vector.
     */
    static GetPerpendicularVector(vector: Vector2): Vector2;

    /**
     * Get a vector reflected about a normal.
     * @param vector Vector to reflect.
     * @param normal Normal about which to reflect.
     * @returns A reflected vector.
     */
    static GetReflectedVector(vector: Vector2, normal: Vector2): Vector2;

    /**
     * Get the signed angle between two Vector2s.
     * @param vector1 First Vector2.
     * @param vector2 Second Vector2.
     * @returns The signed angle between the two vectors.
     */
    static GetSignedAngle(vector1: Vector2, vector2: Vector2): number;

    /**
     * Get the normalized vector.
     * @returns The normalized vector.
     */
    GetNormalized(): Vector2;

    /**
     * Normalize this vector.
     */
    Normalize(): void;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector2): boolean;
}

/**
 * Class for a 2-dimensional double vector.
 */
declare class Vector2D {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Magnitude of the vector. */
    readonly magnitude: number;
    /** Squared magnitude of the vector. */
    readonly squaredMagnitude: number;

    /** Constructor for a Vector2D. */
    constructor();
    /**
     * Constructor for a Vector2D.
     * @param x X component.
     * @param y Y component.
     */
    constructor(x: number, y: number);

    /** Get a down (0, -1) vector. */
    static readonly down: Vector2D;
    /** Get an up (0, 1) vector. */
    static readonly up: Vector2D;
    /** Get a left (-1, 0) vector. */
    static readonly left: Vector2D;
    /** Get a right (1, 0) vector. */
    static readonly right: Vector2D;
    /** Get a vector with both components set to 0. */
    static readonly zero: Vector2D;
    /** Get a vector with both components set to 1. */
    static readonly one: Vector2D;
    /** Get a vector with both components set to +infinity. */
    static readonly positiveInfinity: Vector2D;
    /** Get a vector with both components set to -infinity. */
    static readonly negativeInfinity: Vector2D;

    /**
     * Get the angle between two Vector2Ds.
     * @param vector1 First Vector2D.
     * @param vector2 Second Vector2D.
     * @returns The angle between the two vectors.
     */
    static GetAngle(vector1: Vector2D, vector2: Vector2D): number;

    /**
     * Get a Vector2D clamped to a certain length.
     * @param vector Vector2D to clamp.
     * @param maxLength Maximum length for the Vector2D.
     * @returns A Vector2D clamped to a certain length.
     */
    static GetClampedVector2D(vector: Vector2D, maxLength: number): Vector2D;

    /**
     * Get the distance between two Vector2Ds.
     * @param vector1 First Vector2D.
     * @param vector2 Second Vector2D.
     * @returns The distance between two Vector2Ds.
     */
    static GetDistance(vector1: Vector2D, vector2: Vector2D): number;

    /**
     * Get the dot product between two Vector2Ds.
     * @param leftHand Left hand Vector2D.
     * @param rightHand Right hand Vector2D.
     * @returns The dot product between two Vector2Ds.
     */
    static GetDotProduct(leftHand: Vector2D, rightHand: Vector2D): number;

    /**
     * Linearly interpolate between two Vector2Ds percentage-wise.
     * @param vector1 First Vector2D.
     * @param vector2 Second Vector2D.
     * @param percent Percent between first and second Vector2D.
     * @returns A linearly interpolated Vector2D between the two Vector2Ds.
     */
    static LinearlyInterpolatePercent(vector1: Vector2D, vector2: Vector2D, percent: number): Vector2D;

    /**
     * Linearly interpolate between two Vector2Ds distance-wise.
     * @param vector1 First Vector2D.
     * @param vector2 Second Vector2D.
     * @param maxDistance Maximum distance between first and second Vector2D.
     * @returns A linearly interpolated Vector2D between the two Vector2Ds.
     */
    static LinearlyInterpolate(vector1: Vector2D, vector2: Vector2D, maxDistance: number): Vector2D;

    /**
     * Get the minimum of two Vector2Ds.
     * @param vector1 First Vector2D.
     * @param vector2 Second Vector2D.
     * @returns The minimum of the two Vector2Ds.
     */
    static GetMin(vector1: Vector2D, vector2: Vector2D): Vector2D;

    /**
     * Get the maximum of two Vector2Ds.
     * @param vector1 First Vector2D.
     * @param vector2 Second Vector2D.
     * @returns The maximum of the two Vector2Ds.
     */
    static GetMax(vector1: Vector2D, vector2: Vector2D): Vector2D;

    /**
     * Get a perpendicular vector to the provided vector.
     * @param vector Vector for which to get perpendicular.
     * @returns A perpendicular vector.
     */
    static GetPerpendicularVector(vector: Vector2D): Vector2D;

    /**
     * Get a vector reflected about a normal.
     * @param vector Vector to reflect.
     * @param normal Normal about which to reflect.
     * @returns A reflected vector.
     */
    static GetReflectedVector(vector: Vector2D, normal: Vector2D): Vector2D;

    /**
     * Get the signed angle between two Vector2Ds.
     * @param vector1 First Vector2D.
     * @param vector2 Second Vector2D.
     * @returns The signed angle between the two vectors.
     */
    static GetSignedAngle(vector1: Vector2D, vector2: Vector2D): number;

    /**
     * Get the normalized vector.
     * @returns The normalized vector.
     */
    GetNormalized(): Vector2D;

    /**
     * Normalize this vector.
     */
    Normalize(): void;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector2D): boolean;
}

/**
 * Class for a 2-dimensional integer vector.
 */
declare class Vector2Int {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;

    /** Constructor for a Vector2Int. */
    constructor();
    /**
     * Constructor for a Vector2Int.
     * @param x X component.
     * @param y Y component.
     */
    constructor(x: number, y: number);

    /** Get a down (0, -1) vector. */
    static readonly down: Vector2Int;
    /** Get an up (0, 1) vector. */
    static readonly up: Vector2Int;
    /** Get a left (-1, 0) vector. */
    static readonly left: Vector2Int;
    /** Get a right (1, 0) vector. */
    static readonly right: Vector2Int;
    /** Get a vector with both components set to 0. */
    static readonly zero: Vector2Int;
    /** Get a vector with both components set to 1. */
    static readonly one: Vector2Int;

    /**
     * Get the distance between two Vector2Ints.
     * @param vector1 First Vector2Int.
     * @param vector2 Second Vector2Int.
     * @returns The distance between two Vector2Ints.
     */
    static GetDistance(vector1: Vector2Int, vector2: Vector2Int): number;

    /**
     * Get the minimum of two Vector2Ints.
     * @param vector1 First Vector2Int.
     * @param vector2 Second Vector2Int.
     * @returns The minimum of the two Vector2Ints.
     */
    static GetMin(vector1: Vector2Int, vector2: Vector2Int): Vector2Int;

    /**
     * Get the maximum of two Vector2Ints.
     * @param vector1 First Vector2Int.
     * @param vector2 Second Vector2Int.
     * @returns The maximum of the two Vector2Ints.
     */
    static GetMax(vector1: Vector2Int, vector2: Vector2Int): Vector2Int;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector2Int): boolean;
}

/**
 * Class for a 3-dimensional vector.
 */
declare class Vector3 {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Z component of the vector. */
    z: number;
    /** Magnitude of the vector. */
    readonly magnitude: number;
    /** Squared magnitude of the vector. */
    readonly squaredMagnitude: number;

    /** Constructor for a Vector3. */
    constructor();
    /**
     * Constructor for a Vector3.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     */
    constructor(x: number, y: number, z: number);

    /** Get a down (0, -1, 0) vector. */
    static readonly down: Vector3;
    /** Get an up (0, 1, 0) vector. */
    static readonly up: Vector3;
    /** Get a left (-1, 0, 0) vector. */
    static readonly left: Vector3;
    /** Get a right (1, 0, 0) vector. */
    static readonly right: Vector3;
    /** Get a forward (0, 0, 1) vector. */
    static readonly forward: Vector3;
    /** Get a back (0, 0, -1) vector. */
    static readonly back: Vector3;
    /** Get a vector with all components set to 0. */
    static readonly zero: Vector3;
    /** Get a vector with all components set to 1. */
    static readonly one: Vector3;
    /** Get a vector with all components set to +infinity. */
    static readonly positiveInfinity: Vector3;
    /** Get a vector with all components set to -infinity. */
    static readonly negativeInfinity: Vector3;

    /**
     * Get the angle between two Vector3s.
     * @param vector1 First Vector3.
     * @param vector2 Second Vector3.
     * @returns The angle between the two vectors.
     */
    static GetAngle(vector1: Vector3, vector2: Vector3): number;

    /**
     * Get a Vector3 clamped to a certain length.
     * @param vector Vector3 to clamp.
     * @param maxLength Maximum length for the Vector3.
     * @returns A Vector3 clamped to a certain length.
     */
    static GetClampedVector3(vector: Vector3, maxLength: number): Vector3;

    /**
     * Get the distance between two Vector3s.
     * @param vector1 First Vector3.
     * @param vector2 Second Vector3.
     * @returns The distance between two Vector3s.
     */
    static GetDistance(vector1: Vector3, vector2: Vector3): number;

    /**
     * Get the dot product between two Vector3s.
     * @param leftHand Left hand Vector3.
     * @param rightHand Right hand Vector3.
     * @returns The dot product between two Vector3s.
     */
    static GetDotProduct(leftHand: Vector3, rightHand: Vector3): number;

    /**
     * Get the cross product between two Vector3s.
     * @param leftHand Left hand Vector3.
     * @param rightHand Right hand Vector3.
     * @returns The cross product between two Vector3s.
     */
    static GetCrossProduct(leftHand: Vector3, rightHand: Vector3): Vector3;

    /**
     * Linearly interpolate between two Vector3s percentage-wise.
     * @param vector1 First Vector3.
     * @param vector2 Second Vector3.
     * @param percent Percent between first and second Vector3.
     * @returns A linearly interpolated Vector3 between the two Vector3s.
     */
    static LinearlyInterpolatePercent(vector1: Vector3, vector2: Vector3, percent: number): Vector3;

    /**
     * Linearly interpolate between two Vector3s distance-wise.
     * @param vector1 First Vector3.
     * @param vector2 Second Vector3.
     * @param maxDistance Maximum distance between first and second Vector3.
     * @returns A linearly interpolated Vector3 between the two Vector3s.
     */
    static LinearlyInterpolate(vector1: Vector3, vector2: Vector3, maxDistance: number): Vector3;

    /**
     * Get the minimum of two Vector3s.
     * @param vector1 First Vector3.
     * @param vector2 Second Vector3.
     * @returns The minimum of the two Vector3s.
     */
    static GetMin(vector1: Vector3, vector2: Vector3): Vector3;

    /**
     * Get the maximum of two Vector3s.
     * @param vector1 First Vector3.
     * @param vector2 Second Vector3.
     * @returns The maximum of the two Vector3s.
     */
    static GetMax(vector1: Vector3, vector2: Vector3): Vector3;

    /**
     * Project one vector onto another.
     * @param vector Vector to project.
     * @param onNormal Normal onto which to project.
     * @returns Projected vector.
     */
    static ProjectVectorOnNormal(vector: Vector3, onNormal: Vector3): Vector3;

    /**
     * Project one vector onto a plane defined by a normal.
     * @param vector Vector to project.
     * @param planeNormal Plane normal onto which to project.
     * @returns Projected vector.
     */
    static ProjectVectorOnPlane(vector: Vector3, planeNormal: Vector3): Vector3;

    /**
     * Get a vector reflected about a normal.
     * @param vector Vector to reflect.
     * @param normal Normal about which to reflect.
     * @returns A reflected vector.
     */
    static GetReflectedVector(vector: Vector3, normal: Vector3): Vector3;

    /**
     * Get the signed angle between two Vector3s around an axis.
     * @param vector1 First Vector3.
     * @param vector2 Second Vector3.
     * @param axis Axis around which to measure angle.
     * @returns The signed angle between the two vectors.
     */
    static GetSignedAngle(vector1: Vector3, vector2: Vector3, axis: Vector3): number;

    /**
     * Get the normalized vector.
     * @returns The normalized vector.
     */
    GetNormalized(): Vector3;

    /**
     * Normalize this vector.
     */
    Normalize(): void;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector3): boolean;
}

/**
 * Class for a 3-dimensional double vector.
 */
declare class Vector3D {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Z component of the vector. */
    z: number;
    /** Magnitude of the vector. */
    readonly magnitude: number;
    /** Squared magnitude of the vector. */
    readonly squaredMagnitude: number;

    /** Constructor for a Vector3D. */
    constructor();
    /**
     * Constructor for a Vector3D.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     */
    constructor(x: number, y: number, z: number);

    /** Get a down (0, -1, 0) vector. */
    static readonly down: Vector3D;
    /** Get an up (0, 1, 0) vector. */
    static readonly up: Vector3D;
    /** Get a left (-1, 0, 0) vector. */
    static readonly left: Vector3D;
    /** Get a right (1, 0, 0) vector. */
    static readonly right: Vector3D;
    /** Get a forward (0, 0, 1) vector. */
    static readonly forward: Vector3D;
    /** Get a back (0, 0, -1) vector. */
    static readonly back: Vector3D;
    /** Get a vector with all components set to 0. */
    static readonly zero: Vector3D;
    /** Get a vector with all components set to 1. */
    static readonly one: Vector3D;
    /** Get a vector with all components set to +infinity. */
    static readonly positiveInfinity: Vector3D;
    /** Get a vector with all components set to -infinity. */
    static readonly negativeInfinity: Vector3D;

    /**
     * Get the angle between two Vector3Ds.
     * @param vector1 First Vector3D.
     * @param vector2 Second Vector3D.
     * @returns The angle between the two vectors.
     */
    static GetAngle(vector1: Vector3D, vector2: Vector3D): number;

    /**
     * Get a Vector3D clamped to a certain length.
     * @param vector Vector3D to clamp.
     * @param maxLength Maximum length for the Vector3D.
     * @returns A Vector3D clamped to a certain length.
     */
    static GetClampedVector3D(vector: Vector3D, maxLength: number): Vector3D;

    /**
     * Get the distance between two Vector3Ds.
     * @param vector1 First Vector3D.
     * @param vector2 Second Vector3D.
     * @returns The distance between two Vector3Ds.
     */
    static GetDistance(vector1: Vector3D, vector2: Vector3D): number;

    /**
     * Get the dot product between two Vector3Ds.
     * @param leftHand Left hand Vector3D.
     * @param rightHand Right hand Vector3D.
     * @returns The dot product between two Vector3Ds.
     */
    static GetDotProduct(leftHand: Vector3D, rightHand: Vector3D): number;

    /**
     * Get the cross product between two Vector3Ds.
     * @param leftHand Left hand Vector3D.
     * @param rightHand Right hand Vector3D.
     * @returns The cross product between two Vector3Ds.
     */
    static GetCrossProduct(leftHand: Vector3D, rightHand: Vector3D): Vector3D;

    /**
     * Linearly interpolate between two Vector3Ds percentage-wise.
     * @param vector1 First Vector3D.
     * @param vector2 Second Vector3D.
     * @param percent Percent between first and second Vector3D.
     * @returns A linearly interpolated Vector3D between the two Vector3Ds.
     */
    static LinearlyInterpolatePercent(vector1: Vector3D, vector2: Vector3D, percent: number): Vector3D;

    /**
     * Linearly interpolate between two Vector3Ds distance-wise.
     * @param vector1 First Vector3D.
     * @param vector2 Second Vector3D.
     * @param maxDistance Maximum distance between first and second Vector3D.
     * @returns A linearly interpolated Vector3D between the two Vector3Ds.
     */
    static LinearlyInterpolate(vector1: Vector3D, vector2: Vector3D, maxDistance: number): Vector3D;

    /**
     * Get the minimum of two Vector3Ds.
     * @param vector1 First Vector3D.
     * @param vector2 Second Vector3D.
     * @returns The minimum of the two Vector3Ds.
     */
    static GetMin(vector1: Vector3D, vector2: Vector3D): Vector3D;

    /**
     * Get the maximum of two Vector3Ds.
     * @param vector1 First Vector3D.
     * @param vector2 Second Vector3D.
     * @returns The maximum of the two Vector3Ds.
     */
    static GetMax(vector1: Vector3D, vector2: Vector3D): Vector3D;

    /**
     * Project one vector onto another.
     * @param vector Vector to project.
     * @param onNormal Normal onto which to project.
     * @returns Projected vector.
     */
    static ProjectVectorOnNormal(vector: Vector3D, onNormal: Vector3D): Vector3D;

    /**
     * Project one vector onto a plane defined by a normal.
     * @param vector Vector to project.
     * @param planeNormal Plane normal onto which to project.
     * @returns Projected vector.
     */
    static ProjectVectorOnPlane(vector: Vector3D, planeNormal: Vector3D): Vector3D;

    /**
     * Get a vector reflected about a normal.
     * @param vector Vector to reflect.
     * @param normal Normal about which to reflect.
     * @returns A reflected vector.
     */
    static GetReflectedVector(vector: Vector3D, normal: Vector3D): Vector3D;

    /**
     * Get the signed angle between two Vector3Ds around an axis.
     * @param vector1 First Vector3D.
     * @param vector2 Second Vector3D.
     * @param axis Axis around which to measure angle.
     * @returns The signed angle between the two vectors.
     */
    static GetSignedAngle(vector1: Vector3D, vector2: Vector3D, axis: Vector3D): number;

    /**
     * Get the normalized vector.
     * @returns The normalized vector.
     */
    GetNormalized(): Vector3D;

    /**
     * Normalize this vector.
     */
    Normalize(): void;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector3D): boolean;
}

/**
 * Class for a 3-dimensional integer vector.
 */
declare class Vector3Int {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Z component of the vector. */
    z: number;

    /** Constructor for a Vector3Int. */
    constructor();
    /**
     * Constructor for a Vector3Int.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     */
    constructor(x: number, y: number, z: number);

    /** Get a down (0, -1, 0) vector. */
    static readonly down: Vector3Int;
    /** Get an up (0, 1, 0) vector. */
    static readonly up: Vector3Int;
    /** Get a left (-1, 0, 0) vector. */
    static readonly left: Vector3Int;
    /** Get a right (1, 0, 0) vector. */
    static readonly right: Vector3Int;
    /** Get a forward (0, 0, 1) vector. */
    static readonly forward: Vector3Int;
    /** Get a back (0, 0, -1) vector. */
    static readonly back: Vector3Int;
    /** Get a vector with all components set to 0. */
    static readonly zero: Vector3Int;
    /** Get a vector with all components set to 1. */
    static readonly one: Vector3Int;

    /**
     * Get the distance between two Vector3Ints.
     * @param vector1 First Vector3Int.
     * @param vector2 Second Vector3Int.
     * @returns The distance between two Vector3Ints.
     */
    static GetDistance(vector1: Vector3Int, vector2: Vector3Int): number;

    /**
     * Get the minimum of two Vector3Ints.
     * @param vector1 First Vector3Int.
     * @param vector2 Second Vector3Int.
     * @returns The minimum of the two Vector3Ints.
     */
    static GetMin(vector1: Vector3Int, vector2: Vector3Int): Vector3Int;

    /**
     * Get the maximum of two Vector3Ints.
     * @param vector1 First Vector3Int.
     * @param vector2 Second Vector3Int.
     * @returns The maximum of the two Vector3Ints.
     */
    static GetMax(vector1: Vector3Int, vector2: Vector3Int): Vector3Int;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector3Int): boolean;
}

/**
 * Class for a 4-dimensional vector.
 */
declare class Vector4 {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Z component of the vector. */
    z: number;
    /** W component of the vector. */
    w: number;
    /** Magnitude of the vector. */
    readonly magnitude: number;
    /** Squared magnitude of the vector. */
    readonly squaredMagnitude: number;

    /** Constructor for a Vector4. */
    constructor();
    /**
     * Constructor for a Vector4.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     * @param w W component.
     */
    constructor(x: number, y: number, z: number, w: number);

    /** Get a vector with all components set to 0. */
    static readonly zero: Vector4;
    /** Get a vector with all components set to 1. */
    static readonly one: Vector4;
    /** Get a vector with all components set to +infinity. */
    static readonly positiveInfinity: Vector4;
    /** Get a vector with all components set to -infinity. */
    static readonly negativeInfinity: Vector4;

    /**
     * Get the distance between two Vector4s.
     * @param vector1 First Vector4.
     * @param vector2 Second Vector4.
     * @returns The distance between two Vector4s.
     */
    static GetDistance(vector1: Vector4, vector2: Vector4): number;

    /**
     * Get the dot product between two Vector4s.
     * @param leftHand Left hand Vector4.
     * @param rightHand Right hand Vector4.
     * @returns The dot product between two Vector4s.
     */
    static GetDotProduct(leftHand: Vector4, rightHand: Vector4): number;

    /**
     * Linearly interpolate between two Vector4s percentage-wise.
     * @param vector1 First Vector4.
     * @param vector2 Second Vector4.
     * @param percent Percent between first and second Vector4.
     * @returns A linearly interpolated Vector4 between the two Vector4s.
     */
    static LinearlyInterpolatePercent(vector1: Vector4, vector2: Vector4, percent: number): Vector4;

    /**
     * Get the minimum of two Vector4s.
     * @param vector1 First Vector4.
     * @param vector2 Second Vector4.
     * @returns The minimum of the two Vector4s.
     */
    static GetMin(vector1: Vector4, vector2: Vector4): Vector4;

    /**
     * Get the maximum of two Vector4s.
     * @param vector1 First Vector4.
     * @param vector2 Second Vector4.
     * @returns The maximum of the two Vector4s.
     */
    static GetMax(vector1: Vector4, vector2: Vector4): Vector4;

    /**
     * Get the normalized vector.
     * @returns The normalized vector.
     */
    GetNormalized(): Vector4;

    /**
     * Normalize this vector.
     */
    Normalize(): void;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector4): boolean;
}

/**
 * Class for a 4-dimensional double vector.
 */
declare class Vector4D {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Z component of the vector. */
    z: number;
    /** W component of the vector. */
    w: number;
    /** Magnitude of the vector. */
    readonly magnitude: number;
    /** Squared magnitude of the vector. */
    readonly squaredMagnitude: number;

    /** Constructor for a Vector4D. */
    constructor();
    /**
     * Constructor for a Vector4D.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     * @param w W component.
     */
    constructor(x: number, y: number, z: number, w: number);

    /** Get a vector with all components set to 0. */
    static readonly zero: Vector4D;
    /** Get a vector with all components set to 1. */
    static readonly one: Vector4D;
    /** Get a vector with all components set to +infinity. */
    static readonly positiveInfinity: Vector4D;
    /** Get a vector with all components set to -infinity. */
    static readonly negativeInfinity: Vector4D;

    /**
     * Get the distance between two Vector4Ds.
     * @param vector1 First Vector4D.
     * @param vector2 Second Vector4D.
     * @returns The distance between two Vector4Ds.
     */
    static GetDistance(vector1: Vector4D, vector2: Vector4D): number;

    /**
     * Get the dot product between two Vector4Ds.
     * @param leftHand Left hand Vector4D.
     * @param rightHand Right hand Vector4D.
     * @returns The dot product between two Vector4Ds.
     */
    static GetDotProduct(leftHand: Vector4D, rightHand: Vector4D): number;

    /**
     * Linearly interpolate between two Vector4Ds percentage-wise.
     * @param vector1 First Vector4D.
     * @param vector2 Second Vector4D.
     * @param percent Percent between first and second Vector4D.
     * @returns A linearly interpolated Vector4D between the two Vector4Ds.
     */
    static LinearlyInterpolatePercent(vector1: Vector4D, vector2: Vector4D, percent: number): Vector4D;

    /**
     * Get the minimum of two Vector4Ds.
     * @param vector1 First Vector4D.
     * @param vector2 Second Vector4D.
     * @returns The minimum of the two Vector4Ds.
     */
    static GetMin(vector1: Vector4D, vector2: Vector4D): Vector4D;

    /**
     * Get the maximum of two Vector4Ds.
     * @param vector1 First Vector4D.
     * @param vector2 Second Vector4D.
     * @returns The maximum of the two Vector4Ds.
     */
    static GetMax(vector1: Vector4D, vector2: Vector4D): Vector4D;

    /**
     * Get the normalized vector.
     * @returns The normalized vector.
     */
    GetNormalized(): Vector4D;

    /**
     * Normalize this vector.
     */
    Normalize(): void;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector4D): boolean;
}

/**
 * Class for a 4-dimensional integer vector.
 */
declare class Vector4Int {
    /** X component of the vector. */
    x: number;
    /** Y component of the vector. */
    y: number;
    /** Z component of the vector. */
    z: number;
    /** W component of the vector. */
    w: number;

    /** Constructor for a Vector4Int. */
    constructor();
    /**
     * Constructor for a Vector4Int.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     * @param w W component.
     */
    constructor(x: number, y: number, z: number, w: number);

    /** Get a vector with all components set to 0. */
    static readonly zero: Vector4Int;
    /** Get a vector with all components set to 1. */
    static readonly one: Vector4Int;

    /**
     * Get the distance between two Vector4Ints.
     * @param vector1 First Vector4Int.
     * @param vector2 Second Vector4Int.
     * @returns The distance between two Vector4Ints.
     */
    static GetDistance(vector1: Vector4Int, vector2: Vector4Int): number;

    /**
     * Get the minimum of two Vector4Ints.
     * @param vector1 First Vector4Int.
     * @param vector2 Second Vector4Int.
     * @returns The minimum of the two Vector4Ints.
     */
    static GetMin(vector1: Vector4Int, vector2: Vector4Int): Vector4Int;

    /**
     * Get the maximum of two Vector4Ints.
     * @param vector1 First Vector4Int.
     * @param vector2 Second Vector4Int.
     * @returns The maximum of the two Vector4Ints.
     */
    static GetMax(vector1: Vector4Int, vector2: Vector4Int): Vector4Int;

    /**
     * Check if this vector is equal to another.
     * @param other Other vector to compare to.
     * @returns Whether the vectors are equal.
     */
    AreEqual(other: Vector4Int): boolean;
}

/**
 * Class for a quaternion.
 */
declare class Quaternion {
    /** X component of the quaternion. */
    x: number;
    /** Y component of the quaternion. */
    y: number;
    /** Z component of the quaternion. */
    z: number;
    /** W component of the quaternion. */
    w: number;

    /** An identity (0, 0, 0, 1) quaternion. */
    static readonly identity: Quaternion;

    /** Constructor for a Quaternion. */
    constructor();
    /**
     * Constructor for a Quaternion.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     * @param w W component.
     */
    constructor(x: number, y: number, z: number, w: number);
    /**
     * Constructor for a Quaternion using an angle axis input.
     * @param angle Angle.
     * @param axis Axis.
     */
    constructor(angle: number, axis: Vector3);

    /**
     * Get the angle between two Quaternions.
     * @param quaternion1 First Quaternion.
     * @param quaternion2 Second Quaternion.
     * @returns The angle between the two quaternions.
     */
    static GetAngle(quaternion1: Quaternion, quaternion2: Quaternion): number;

    /**
     * Get a Quaternion from Euler angles.
     * @param x Rotation around x axis.
     * @param y Rotation around y axis.
     * @param z Rotation around z axis.
     * @returns Quaternion from provided Euler angles.
     */
    static FromEulerAngles(x: number, y: number, z: number): Quaternion;

    /**
     * Get the inverse of a Quaternion.
     * @param quaternion The quaternion.
     * @returns The inverse of the quaternion.
     */
    static GetInverse(quaternion: Quaternion): Quaternion;

    /**
     * Linearly interpolate between two Quaternions percentage-wise.
     * @param quaternion1 First Quaternion.
     * @param quaternion2 Second Quaternion.
     * @param percent Percent between first and second Quaternion.
     * @returns A linearly interpolated Quaternion between the two Quaternions.
     */
    static LinearlyInterpolatePercent(quaternion1: Quaternion, quaternion2: Quaternion, percent: number): Quaternion;

    /**
     * Linearly interpolate between two Quaternions distance-wise.
     * @param quaternion1 First Quaternion.
     * @param quaternion2 Second Quaternion.
     * @param maxDistance Maximum distance between first and second Quaternion.
     * @returns A linearly interpolated Quaternion between the two Quaternions.
     */
    static LinearlyInterpolate(quaternion1: Quaternion, quaternion2: Quaternion, maxDistance: number): Quaternion;

    /**
     * Linearly interpolate unclamped between two Quaternions percentage-wise.
     * @param quaternion1 First Quaternion.
     * @param quaternion2 Second Quaternion.
     * @param percent Percent between first and second Quaternion.
     * @returns A linearly interpolated unclamped Quaternion between the two Quaternions.
     */
    static LinearlyInterpolatePercentUnclamped(quaternion1: Quaternion, quaternion2: Quaternion, percent: number): Quaternion;

    /**
     * Create a quaternion with a given forward and up direction.
     * @param forward Forward direction.
     * @param up Up direction.
     * @returns A quaternion with a given forward and up direction.
     */
    static CreateLookRotation(forward: Vector3, up?: Vector3): Quaternion;

    /**
     * Get Euler angle representation of the quaternion.
     * @returns Euler angle representation of the quaternion.
     */
    GetEulerAngles(): Vector3;

    /**
     * Get the dot product between two Quaternions.
     * @param first First Quaternion.
     * @param second Second Quaternion.
     * @returns The dot product between two Quaternions.
     */
    static GetDotProduct(first: Quaternion, second: Quaternion): number;

    /**
     * Get the rotation from one Vector3 to another Vector3.
     * @param from First Vector3.
     * @param to Second Vector3.
     * @returns The rotation from one Vector3 to another Vector3.
     */
    static GetRotationFromToVector3s(from: Vector3, to: Vector3): Quaternion;

    /**
     * Get a normalized Quaternion (with a magnitude of 1).
     * @param quaternion Input Quaternion.
     * @returns A normalized Quaternion.
     */
    static GetNormalized(quaternion: Quaternion): Quaternion;

    /**
     * Interpolate between two Quaternions.
     * @param quaternion1 First Quaternion.
     * @param quaternion2 Second Quaternion.
     * @param maxDegrees Maximum degrees between first and second Quaternion.
     * @returns An interpolated Quaternion between the two Quaternions.
     */
    static Interpolate(quaternion1: Quaternion, quaternion2: Quaternion, maxDegrees: number): Quaternion;

    /**
     * Spherically interpolate between two Quaternions.
     * @param quaternion1 First Quaternion.
     * @param quaternion2 Second Quaternion.
     * @param percent Percentage between the two quaternions to interpolate.
     * @returns A spherically interpolated Quaternion between the two Quaternions.
     */
    static SphericallyInterpolate(quaternion1: Quaternion, quaternion2: Quaternion, percent: number): Quaternion;

    /**
     * Spherically interpolate unclamped between two Quaternions.
     * @param quaternion1 First Quaternion.
     * @param quaternion2 Second Quaternion.
     * @param percent Percentage between the two quaternions to interpolate.
     * @returns A spherically interpolated unclamped Quaternion between the two Quaternions.
     */
    static SphericallyInterpolateUnclamped(quaternion1: Quaternion, quaternion2: Quaternion, percent: number): Quaternion;

    /**
     * Get angle axis representation of the quaternion.
     * @returns Tuple containing angle and axis.
     */
    GetAngleAxis(): [number, Vector3];

    /**
     * Combine two Quaternions.
     * @param quaternion1 First quaternion.
     * @param quaternion2 Second quaternion.
     * @returns The combination of the two Quaternions.
     */
    static Combine(quaternion1: Quaternion, quaternion2: Quaternion): Quaternion;

    /**
     * Check if two quaternions are equal.
     * @param first First quaternion.
     * @param second Second quaternion.
     * @returns Whether the quaternions are equal.
     */
    static AreEqual(first: Quaternion, second: Quaternion): boolean;
}

/**
 * Class for a double-precision quaternion.
 */
declare class QuaternionD {
    /** X component of the quaternion. */
    x: number;
    /** Y component of the quaternion. */
    y: number;
    /** Z component of the quaternion. */
    z: number;
    /** W component of the quaternion. */
    w: number;

    /** An identity (0, 0, 0, 1) quaternion. */
    static readonly identity: QuaternionD;

    /** Constructor for a QuaternionD. */
    constructor();
    /**
     * Constructor for a QuaternionD.
     * @param x X component.
     * @param y Y component.
     * @param z Z component.
     * @param w W component.
     */
    constructor(x: number, y: number, z: number, w: number);
    /**
     * Constructor for a QuaternionD using an angle axis input.
     * @param angle Angle.
     * @param axis Axis.
     */
    constructor(angle: number, axis: Vector3D);

    /**
     * Get the angle between two QuaternionDs.
     * @param quaternion1 First QuaternionD.
     * @param quaternion2 Second QuaternionD.
     * @returns The angle between the two quaternions.
     */
    static GetAngle(quaternion1: QuaternionD, quaternion2: QuaternionD): number;

    /**
     * Get a QuaternionD from Euler angles.
     * @param x Rotation around x axis.
     * @param y Rotation around y axis.
     * @param z Rotation around z axis.
     * @returns QuaternionD from provided Euler angles.
     */
    static FromEulerAngles(x: number, y: number, z: number): QuaternionD;

    /**
     * Get the inverse of a QuaternionD.
     * @param quaternion The quaternion.
     * @returns The inverse of the quaternion.
     */
    static GetInverse(quaternion: QuaternionD): QuaternionD;

    /**
     * Linearly interpolate between two QuaternionDs percentage-wise.
     * @param quaternion1 First QuaternionD.
     * @param quaternion2 Second QuaternionD.
     * @param percent Percent between first and second QuaternionD.
     * @returns A linearly interpolated QuaternionD between the two QuaternionDs.
     */
    static LinearlyInterpolatePercent(quaternion1: QuaternionD, quaternion2: QuaternionD, percent: number): QuaternionD;

    /**
     * Linearly interpolate between two QuaternionDs distance-wise.
     * @param quaternion1 First QuaternionD.
     * @param quaternion2 Second QuaternionD.
     * @param maxDistance Maximum distance between first and second QuaternionD.
     * @returns A linearly interpolated QuaternionD between the two QuaternionDs.
     */
    static LinearlyInterpolate(quaternion1: QuaternionD, quaternion2: QuaternionD, maxDistance: number): QuaternionD;

    /**
     * Linearly interpolate unclamped between two QuaternionDs percentage-wise.
     * @param quaternion1 First QuaternionD.
     * @param quaternion2 Second QuaternionD.
     * @param percent Percent between first and second QuaternionD.
     * @returns A linearly interpolated unclamped QuaternionD between the two QuaternionDs.
     */
    static LinearlyInterpolatePercentUnclamped(quaternion1: QuaternionD, quaternion2: QuaternionD, percent: number): QuaternionD;

    /**
     * Create a quaternion with a given forward and up direction.
     * @param forward Forward direction.
     * @param up Up direction.
     * @returns A quaternion with a given forward and up direction.
     */
    static CreateLookRotation(forward: Vector3D, up?: Vector3D): QuaternionD;

    /**
     * Get Euler angle representation of the quaternion.
     * @returns Euler angle representation of the quaternion.
     */
    GetEulerAngles(): Vector3D;

    /**
     * Get the dot product between two QuaternionDs.
     * @param first First QuaternionD.
     * @param second Second QuaternionD.
     * @returns The dot product between two QuaternionDs.
     */
    static GetDotProduct(first: QuaternionD, second: QuaternionD): number;

    /**
     * Get the rotation from one Vector3D to another Vector3D.
     * @param from First Vector3D.
     * @param to Second Vector3D.
     * @returns The rotation from one Vector3D to another Vector3D.
     */
    static GetRotationFromToVector3Ds(from: Vector3D, to: Vector3D): QuaternionD;

    /**
     * Get a normalized QuaternionD (with a magnitude of 1).
     * @param quaternion Input QuaternionD.
     * @returns A normalized QuaternionD.
     */
    static GetNormalized(quaternion: QuaternionD): QuaternionD;

    /**
     * Interpolate between two QuaternionDs.
     * @param quaternion1 First QuaternionD.
     * @param quaternion2 Second QuaternionD.
     * @param maxDegrees Maximum degrees between first and second QuaternionD.
     * @returns An interpolated QuaternionD between the two QuaternionDs.
     */
    static Interpolate(quaternion1: QuaternionD, quaternion2: QuaternionD, maxDegrees: number): QuaternionD;

    /**
     * Spherically interpolate between two QuaternionDs.
     * @param quaternion1 First QuaternionD.
     * @param quaternion2 Second QuaternionD.
     * @param percent Percentage between the two quaternions to interpolate.
     * @returns A spherically interpolated QuaternionD between the two QuaternionDs.
     */
    static SphericallyInterpolate(quaternion1: QuaternionD, quaternion2: QuaternionD, percent: number): QuaternionD;

    /**
     * Spherically interpolate unclamped between two QuaternionDs.
     * @param quaternion1 First QuaternionD.
     * @param quaternion2 Second QuaternionD.
     * @param percent Percentage between the two quaternions to interpolate.
     * @returns A spherically interpolated unclamped QuaternionD between the two QuaternionDs.
     */
    static SphericallyInterpolateUnclamped(quaternion1: QuaternionD, quaternion2: QuaternionD, percent: number): QuaternionD;

    /**
     * Get angle axis representation of the quaternion.
     * @returns Tuple containing angle and axis.
     */
    GetAngleAxis(): [number, Vector3D];

    /**
     * Combine two QuaternionDs.
     * @param quaternion1 First quaternion.
     * @param quaternion2 Second quaternion.
     * @returns The combination of the two QuaternionDs.
     */
    static Combine(quaternion1: QuaternionD, quaternion2: QuaternionD): QuaternionD;

    /**
     * Check if two quaternions are equal.
     * @param first First quaternion.
     * @param second Second quaternion.
     * @returns Whether the quaternions are equal.
     */
    static AreEqual(first: QuaternionD, second: QuaternionD): boolean;
}

/**
 * Class for a UUID.
 */
declare class UUID {
    /**
     * Constructor for a UUID.
     * @param input Input string to use (optional).
     */
    constructor(input?: string);

    /**
     * Get a new UUID.
     * @returns A new UUID.
     */
    static NewUUID(): UUID;

    /**
     * Parse a UUID from a string.
     * @param input Input string to use.
     * @returns A UUID containing the provided value, or null.
     */
    static Parse(input: string): UUID;

    /**
     * Convert UUID to string.
     * @returns String representation of the UUID, or null.
     */
    ToString(): string | null;
}

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Interaction state enum.
 */
/**
 * Interaction state for an entity.
 * Hidden: Visibly hidden and not interactable.
 * Static: Visible but not interactable.
 * Physical: Visible and interactable.
 * Placing: Visible and in a placing interaction mode.
 */
declare enum InteractionState {
    Hidden = 0,
    Static = 1,
    Physical = 2,
    Placing = 3
}

declare interface EntityMotion {
    /** Angular velocity of the entity. */
    angularVelocity: Vector3;
    /** Whether or not the entity is stationary. */
    stationary: boolean;
    /** Velocity of the entity. */
    velocity: Vector3;
}

/**
 * Class for entity physical properties.
 */
declare class EntityPhysicalProperties {
    /** Angular drag of the entity. */
    angularDrag: number | null;
    /** Center of mass of the entity. */
    centerOfMass: Vector3 | null;
    /** Drag of the entity. */
    drag: number | null;
    /** Whether or not the entity is gravitational. */
    gravitational: boolean | null;
    /** Mass of the entity. */
    mass: number | null;

    /**
     * Constructor for entity physical properties.
     * @param angularDrag Angular drag of the entity.
     * @param centerOfMass Center of mass of the entity.
     * @param drag Drag of the entity.
     * @param gravitational Whether or not the entity is gravitational.
     * @param mass Mass of the entity.
     */
    constructor(angularDrag: number | null, centerOfMass: Vector3 | null, drag: number | null, gravitational: boolean | null, mass: number | null);
}

/**
 * Struct for light properties.
 */
declare interface LightProperties {
    /** Color of the light. */
    color: Color;
    /** Temperature of the light. */
    temperature: number;
    /** Intensity of the light. */
    intensity: number;
    /** Range of the light. */
    range: number;
    /** Inner spot angle for the light. */
    innerSpotAngle: number;
    /** Outer spot angle for the light. */
    outerSpotAngle: number;
}

/**
 * Light type enum.
 */
declare enum LightType {
    Directional = 0,
    Spot = 1,
    Point = 2
}

/**
 * Text alignment enum.
 */
declare enum TextAlignment {
    TopLeft = 0,
    TopCenter = 1,
    TopRight = 2,
    MiddleLeft = 3,
    MiddleCenter = 4,
    MiddleRight = 5,
    BottomLeft = 6,
    BottomCenter = 7,
    BottomRight = 8
}

/**
 * Text wrapping enum.
 */
declare enum TextWrapping {
    NoWrap = 0,
    Wrap = 1,
    Overflow = 2
}

/**
 * UI element alignment enum.
 */
declare enum UIElementAlignment {
    TopLeft = 0,
    TopCenter = 1,
    TopRight = 2,
    MiddleLeft = 3,
    MiddleCenter = 4,
    MiddleRight = 5,
    BottomLeft = 6,
    BottomCenter = 7,
    BottomRight = 8,
    Stretch = 9
}

/**
 * Terrain entity brush type enum.
 */
declare enum TerrainEntityBrushType {
    sphere = 0,
    roundedCube = 1
}

/**
 * Struct for terrain entity layer.
 */
declare interface TerrainEntityLayer {
    /** Diffuse texture path. */
    diffuse: string;
    /** Normal texture path. */
    normal: string;
    /** Mask texture path. */
    mask: string;
    /** Specular value. */
    specular: Color;
    /** Metallic value. */
    metallic: number;
    /** Smoothness value. */
    smoothness: number;
    /** Tile size. */
    tileSize: Vector2;
    /** Tile offset. */
    tileOffset: Vector2;
}

/**
 * Class for terrain entity layer mask.
 */
declare class TerrainEntityLayerMask {
    /** Constructor for a terrain entity layer mask. */
    constructor();
}

/**
 * Class for terrain entity layer mask collection.
 */
declare class TerrainEntityLayerMaskCollection {
    /** Constructor for a terrain entity layer mask collection. */
    constructor();
}

/**
 * Class for terrain entity modification.
 */
declare class TerrainEntityModification {
    /** Operation type. */
    operation: TerrainEntityOperation;
    /** Brush type. */
    brushType: TerrainEntityBrushType;
    /** Position. */
    position: Vector3;
    /** Brush size. */
    brushSize: number;
    /** Brush strength. */
    brushStrength: number;
    /** Layer. */
    layer: number;

    /** Constructor for a terrain entity modification. */
    constructor();
}

/**
 * Terrain entity operation enum.
 */
declare enum TerrainEntityOperation {
    Modify = 0,
    Paint = 1
}

/**
 * Class for voxel block information.
 */
declare class VoxelBlockInfo {
    /** Block ID. */
    id: number;
    /** Block subtype. */
    subType: VoxelBlockSubType;

    /** Constructor for voxel block info. */
    constructor();
}

/**
 * Struct for voxel block subtype.
 */
declare interface VoxelBlockSubType {
    /** Subtype ID. */
    id: number;
}

/**
 * Automobile type enum.
 */
declare enum AutomobileType {
    Default = 0
}

/**
 * Class for automobile entity wheel.
 */
declare class AutomobileEntityWheel {
    /** Submesh corresponding to the wheel. */
    wheelSubMesh: string;
    /** Radius of the wheel. */
    wheelRadius: number;

    /**
     * Constructor for automobile entity wheel.
     * @param wheelSubMesh Submesh corresponding to the wheel.
     * @param wheelRadius Radius of the wheel.
     */
    constructor(wheelSubMesh: string, wheelRadius: number);
}

/**
 * Class for a generic entity.
 */
declare class Entity {
    /**
     * Get the entity corresponding to an ID.
     * @param id ID of the entity to get.
     * @returns The entity corresponding to the ID, or null.
     */
    static Get(id: string): BaseEntity | null;

    /**
     * Get the entity corresponding to a tag.
     * @param tag Tag of the entity to get.
     * @returns The entity corresponding to the tag, or null.
     */
    static GetByTag(tag: string): BaseEntity | null;
}

/**
 * Class for a base entity.
 */
declare class BaseEntity {
    /** ID of the entity. */
    readonly id: UUID;
    /** Tag of the entity. */
    tag: string;

    /** Constructor for the entity. */
    constructor();

    /**
     * Get the entity corresponding to an ID.
     * @param id ID of the entity to get.
     * @returns The entity corresponding to the ID, or null.
     */
    static Get(id: string): BaseEntity | null;

    /**
     * Set the parent of the entity.
     * @param parent Entity to make parent of this one, or null.
     * @returns Whether or not the operation was successful.
     */
    SetParent(parent: BaseEntity | null): boolean;

    /**
     * Get the parent of the entity.
     * @returns The parent of the entity, or null.
     */
    GetParent(): BaseEntity | null;

    /**
     * Place the world camera on this entity.
     * @returns Whether or not the operation was successful.
     */
    PlaceCameraOn(): boolean;

    /**
     * Get the children of the entity.
     * @returns An array of entities that are children of this one.
     */
    GetChildren(): BaseEntity[];

    /**
     * Get the transform of the entity.
     * @returns The transform of the entity.
     */
    GetTransform(): Transform;

    /**
     * Get the position of the entity.
     * @param local Whether or not to get the local position.
     * @returns The position of the entity.
     */
    GetPosition(local: boolean): Vector3;

    /**
     * Set the position of the entity.
     * @param position Position to set.
     * @param local Whether or not to set the local position.
     * @param synchronizeChange Whether or not to synchronize the change.
     * @returns Whether or not the operation was successful.
     */
    SetPosition(position: Vector3, local?: boolean, synchronizeChange?: boolean): boolean;

    /**
     * Get the rotation of the entity.
     * @param local Whether or not to get the local rotation.
     * @returns The rotation of the entity.
     */
    GetRotation(local?: boolean): Quaternion;

    /**
     * Set the rotation of the entity.
     * @param rotation Rotation to set.
     * @param local Whether or not to set the local rotation.
     * @param synchronizeChange Whether or not to synchronize the change.
     * @returns Whether or not the operation was successful.
     */
    SetRotation(rotation: Quaternion, local?: boolean, synchronizeChange?: boolean): boolean;

    /**
     * Get the Euler rotation of the entity.
     * @param local Whether or not to get the local rotation.
     * @returns The Euler rotation of the entity.
     */
    GetEulerRotation(local: boolean): Vector3;

    /**
     * Set the Euler rotation of the entity.
     * @param eulerRotation Euler rotation to set.
     * @param local Whether or not the rotation is local.
     * @param synchronizeChange Whether or not to synchronize the change.
     * @returns Whether or not the operation was successful.
     */
    SetEulerRotation(eulerRotation: Vector3, local: boolean, synchronizeChange?: boolean): boolean;

    /**
     * Get the scale of the entity.
     * @returns The scale of the entity.
     */
    GetScale(): Vector3;

    /**
     * Set the scale of the entity.
     * @param scale Scale to set.
     * @param synchronizeChange Whether or not to synchronize the change with other clients.
     * @returns Whether or not the operation was successful.
     */
    SetScale(scale: Vector3, synchronizeChange?: boolean): boolean;

    /**
     * Get the size of the entity.
     * @returns The size of the entity.
     */
    GetSize(): Vector3;

    /**
     * Set the size of the entity.
     * @param size Size to set.
     * @param synchronizeChange Whether or not to synchronize the change with other clients.
     * @returns Whether or not the operation was successful.
     */
    SetSize(size: Vector3, synchronizeChange?: boolean): boolean;

    /**
     * Get the visibility of the entity.
     * @returns Whether or not the entity is visible.
     */
    GetVisibility(): boolean;

    /**
     * Set the visibility of the entity.
     * @param visible Whether or not the entity should be visible.
     * @param synchronize Whether or not to synchronize the change with other clients.
     * @returns Whether or not the operation was successful.
     */
    SetVisibility(visible: boolean, synchronize?: boolean): boolean;

    /**
     * Get the highlight state of the entity.
     * @returns Whether or not the entity is highlighted.
     */
    GetHighlight(): boolean;

    /**
     * Set the highlight state of the entity.
     * @param highlight Whether or not the entity should be highlighted.
     * @returns Whether or not the operation was successful.
     */
    SetHighlight(highlight: boolean): boolean;

    /**
     * Get the motion state of the entity.
     * @returns The motion state of the entity.
     */
    GetMotion(): EntityMotion;

    /**
     * Set the motion state of the entity.
     * @param motion Motion state to set.
     * @returns Whether or not the operation was successful.
     */
    SetMotion(motion: EntityMotion): boolean;

    /**
     * Get the physical properties of the entity.
     * @returns The physical properties of the entity.
     */
    GetPhysicalProperties(): EntityPhysicalProperties;

    /**
     * Set the physical properties of the entity.
     * @param properties Physical properties to set.
     * @returns Whether or not the operation was successful.
     */
    SetPhysicalProperties(properties: EntityPhysicalProperties): boolean;

    /**
     * Get the interaction state of the entity.
     * @returns The interaction state of the entity.
     */
    GetInteractionState(): InteractionState;

    /**
     * Set the interaction state of the entity.
     * @param state Interaction state to set.
     * @returns Whether or not the operation was successful.
     */
    SetInteractionState(state: InteractionState): boolean;

    /**
     * Delete the entity.
     * @param synchronizeChange Whether or not to synchronize the change with other clients.
     * @returns Whether or not the operation was successful.
     */
    Delete(synchronizeChange?: boolean): boolean;

    /**
     * Place camera on the entity.
     */
    PlaceCameraOn(): void;

    /**
     * Compare this entity with another.
     * @param other Other entity to compare with.
     * @returns Whether or not the entities match.
     */
    Compare(other: BaseEntity): boolean;

    /**
     * Get a raycast forward from this entity.
     * @returns A raycast forward from this entity, or null.
     */
    GetRaycast(): RaycastHitInfo | null;

    /**
     * Get a raycast from this entity.
     * @param direction Direction to cast the ray in.
     * @returns A raycast from this entity, or null.
     */
    GetRaycast(direction: Vector3): RaycastHitInfo | null;

    /**
     * Add a placement socket to the entity.
     * @param position Position of the placement socket relative to the entity.
     * @param rotation Rotation of the placement socket relative to the entity.
     * @param connectingOffset Offset to apply when connecting to another socket.
     * @returns Whether or not the operation was successful.
     */
    AddSocket(position: Vector3, rotation: Quaternion, connectingOffset: Vector3): boolean;

    /**
     * Play an animation.
     * @param animationName Name of animation to play.
     * @returns Whether or not the operation was successful.
     */
    PlayAnimation(animationName: string): boolean;

    /**
     * Stop an animation.
     * @param animationName Name of animation to stop.
     * @returns Whether or not the operation was successful.
     */
    StopAnimation(animationName: string): boolean;

    /**
     * Set the speed of an animation.
     * @param animationName Name of animation to set speed of.
     * @param speed Speed to set animation to.
     * @returns Whether or not the operation was successful.
     */
    SetAnimationSpeed(animationName: string, speed: number): boolean;

    /**
     * Enable broadcasting of position via synchronizer.
     * @param interval Interval at which to broadcast, <= 0 to not broadcast.
     * @returns Whether or not the operation was successful.
     */
    EnablePositionBroadcast(interval: number): boolean;

    /**
     * Disable broadcasting of position via synchronizer.
     * @returns Whether or not the operation was successful.
     */
    DisablePositionBroadcast(): boolean;

    /**
     * Enable broadcasting of rotation via synchronizer.
     * @param interval Interval at which to broadcast, <= 0 to not broadcast.
     * @returns Whether or not the operation was successful.
     */
    EnableRotationBroadcast(interval: number): boolean;

    /**
     * Disable broadcasting of rotation via synchronizer.
     * @returns Whether or not the operation was successful.
     */
    DisableRotationBroadcast(): boolean;
}

/**
 * Class for an airplane entity.
 */
/**
 * Class for an airplane entity.
 */
declare class AirplaneEntity extends BaseEntity {
    /** Constructor for airplane entity. */
    constructor();

    /** Throttle. */
    throttle: number;
    /** Pitch. */
    pitch: number;
    /** Roll. */
    roll: number;
    /** Yaw. */
    yaw: number;

    /**
     * Create an airplane entity.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param mass Mass of the airplane entity.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created airplane entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     * @returns The airplane entity object.
     */
    static Create(parent: BaseEntity?, meshObject: string, meshResources: string[], position: Vector3, rotation: Quaternion, mass: number, id?: string, tag?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): AirplaneEntity;

    /**
     * Create an airplane entity.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param mass Mass of the airplane entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity.
     * @param isSize Whether or not to use size instead of scale.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created airplane entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     * @returns The airplane entity object.
     */
    static Create(parent: BaseEntity?, meshObject: string, meshResources: string[], mass: number, position: Vector3, rotation: Quaternion, scale: Vector3, isSize: boolean, id?: string, tag?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): AirplaneEntity;

    /**
     * Create an airplane entity from a JSON string.
     * @param jsonEntity JSON string containing the airplane entity configuration.
     * @param parent Parent entity for the airplane entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created airplane entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Start the engine.
     */
    StartEngine(): void;

    /**
     * Stop the engine.
     */
    StopEngine(): void;
}

/**
 * Class for an audio entity.
 */
/**
 * Class for an audio entity.
 */
declare class AudioEntity extends BaseEntity {
    /** Constructor for audio entity. */
    constructor();

    /** Whether or not to loop the audio clip. */
    loop: boolean;
    /** Priority for the audio clip. Values between 0 and 256, with 0 being highest priority. */
    priority: number;
    /** Volume for the audio clip. Values between 0 and 1, with 1 being highest volume. */
    volume: number;
    /** Pitch for the audio clip. Values between -3 and 3. */
    pitch: number;
    /** Audio pan for the audio clip if playing in stereo. Values between -1 and 1, with -1 being furthest to the left and 1 being furthest to the right. */
    stereoPan: number;

    /**
     * Create an audio entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created audio entity object.
     * @returns The audio entity object.
     */
    static Create(parent: BaseEntity?, position: Vector3, rotation: Quaternion, id?: string, tag?: string, onLoaded?: string): AudioEntity;

    /**
     * Create an audio entity from a JSON string.
     * @param jsonEntity JSON string containing the audio entity configuration.
     * @param parent Parent entity for the audio entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created audio entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Load an audio clip from a .wav file.
     * @param filePath Path to audio clip file.
     * @returns Whether or not the operation was successful.
     */
    LoadAudioClipFromWAV(filePath: string): boolean;

    /**
     * Play the audio.
     * @returns Whether or not the operation was successful.
     */
    Play(): boolean;

    /**
     * Stop playing the audio.
     * @returns Whether or not the operation was successful.
     */
    Stop(): boolean;

    /**
     * Toggle pausing the audio.
     * @param pause Whether or not to pause.
     * @returns Whether or not the operation was successful.
     */
    TogglePause(pause: boolean): boolean;
}

/**
 * Class for an automobile entity.
 */
declare class AutomobileEntity extends BaseEntity {
    /** Constructor for automobile entity. */
    constructor();

    /** Engine start/stop. */
    engineStartStop: boolean;
    /** Brake. */
    brake: number;
    /** Hand brake. */
    handBrake: number;
    /** Horn. */
    horn: boolean;
    /** Throttle. */
    throttle: number;
    /** Steer. */
    steer: number;
    /** Gear. */
    gear: number;

    /**
     * Create an automobile entity.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param wheels Wheels for the automobile entity.
     * @param mass Mass of the automobile entity.
     * @param type Type of automobile entity.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created automobile entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     * @returns The automobile entity object.
     */
    static Create(parent: BaseEntity?, meshObject: string, meshResources: string[], position: Vector3, rotation: Quaternion, wheels: AutomobileEntityWheel[], mass: number, type: AutomobileType, id?: string, tag?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): AutomobileEntity;

    /**
     * Create an automobile entity.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param mass Mass of the automobile entity.
     * @param type Type of automobile entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity.
     * @param isSize Whether or not to use size instead of scale.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created automobile entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     * @returns The automobile entity object.
     */
    static Create(parent: BaseEntity?, meshObject: string, meshResources: string[], wheels: AutomobileEntityWheel[], mass: number, type: AutomobileType, position: Vector3, rotation: Quaternion, scale: Vector3, isSize: boolean, id?: string, tag?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): AutomobileEntity;

    /**
     * Create an automobile entity from a JSON string.
     * @param jsonEntity JSON string containing the automobile entity configuration.
     * @param parent Parent entity for the automobile entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created automobile entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;
}

/**
 * Class for a button entity.
 */
declare class ButtonEntity extends BaseEntity {
    /** Constructor for button entity. */
    constructor();

    /**
     * Create a button entity.
     * @param parent Parent canvas of the entity to create.
     * @param onClick Action to perform on button click.
     * @param positionPercent Position of the entity within its canvas.
     * @param sizePercent Size of the entity relative to its canvas.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created button entity object.
     * @returns The button entity object.
     */
    static Create(parent: CanvasEntity, onClick: string, positionPercent: Vector2, sizePercent: Vector2, id?: string, tag?: string, onLoaded?: string): ButtonEntity;

    /**
     * Create a button entity from a JSON string.
     * @param jsonEntity JSON string containing the button entity configuration.
     * @param parent Parent entity for the button entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created button entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Set the onClick event for the button entity.
     * @param onClick Action to perform on click.
     * @returns Whether or not the setting was successful.
     */
    SetOnClick(onClick: string): boolean;

    /**
     * Set the background image for the button entity.
     * @param imagePath Path to the image to set the background to.
     * @returns Whether or not the setting was successful.
     */
    SetBackground(imagePath: string): boolean;

    /**
     * Set the base color for the button entity.
     * @param color Color to set the button entity to.
     * @returns Whether or not the setting was successful.
     */
    SetBaseColor(color: Color): boolean;

    /**
     * Set the colors for the button entity.
     * @param defaultColor Color to set the default color for the button entity to.
     * @param hoverColor Color to set the hover color for the button entity to.
     * @param clickColor Color to set the click color for the button entity to.
     * @param inactiveColor Color to set the inactive color for the button entity to.
     * @returns Whether or not the setting was successful.
     */
    SetColors(defaultColor: Color, hoverColor: Color, clickColor: Color, inactiveColor: Color): boolean;

    /**
     * Stretch the button entity to fill its parent.
     * @param stretch Whether to stretch to parent. If false, restores normal sizing.
     * @returns Whether or not the operation was successful.
     */
    StretchToParent(stretch?: boolean): boolean;

    /**
     * Set the alignment of the button entity within its parent.
     * @param alignment Alignment to set.
     * @returns Whether or not the operation was successful.
     */
    SetAlignment(alignment: UIElementAlignment): boolean;
}

/**
 * Class for a canvas entity.
 */
/**
 * Class for a canvas entity.
 */
declare class CanvasEntity extends BaseEntity {
    /** Constructor for canvas entity. */
    constructor();

    /**
     * Create a canvas entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param isSize Whether or not the scale parameter is a size.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created canvas entity object.
     * @returns The canvas entity object.
     */
    static Create(parent?: BaseEntity, position: Vector3, rotation: Quaternion, scale: Vector3, isSize?: boolean, id?: string, tag?: string, onLoaded?: string): CanvasEntity;

    /**
     * Create a canvas entity from a JSON string.
     * @param jsonEntity JSON string containing the canvas entity configuration.
     * @param parent Parent entity for the canvas entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created canvas entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Make the canvas a world canvas.
     * @returns Whether or not the setting was successful.
     */
    MakeWorldCanvas(): boolean;

    /**
     * Make the canvas a screen canvas.
     * @param synchronize Whether or not to synchronize the setting.
     * @returns Whether or not the setting was successful.
     */
    MakeScreenCanvas(synchronize?: boolean): boolean;

    /**
     * Returns whether or not the canvas entity is a screen canvas.
     * @returns Whether or not the canvas entity is a screen canvas.
     */
    IsScreenCanvas(): boolean;

    /**
     * Set the size for the screen canvas.
     * @param size Size to set the screen canvas to.
     * @param synchronizeChange Whether or not to synchronize the change.
     * @returns Whether or not the operation was successful.
     */
    SetSize(size: Vector2, synchronizeChange?: boolean): boolean;
}

/**
 * Class for a character entity.
 */
/**
 * Class for a character entity.
 */
declare class CharacterEntity extends BaseEntity {
    /** Constructor for character entity. */
    constructor();

    /** Whether or not to fix the height if below ground. */
    fixHeight: boolean;

    /**
     * Create a character entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param isSize Whether or not the scale parameter is a size.
     * @param tag Tag of the character entity.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created character entity object.
     * @returns The character entity object.
     */
    static Create(parent: BaseEntity?, position: Vector3, rotation: Quaternion, scale: Vector3, isSize?: boolean, tag?: string, id?: string, onLoaded?: string): CharacterEntity;

    /**
     * Create a character entity with mesh.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param meshOffset Offset for the mesh character entity object.
     * @param meshRotation Rotation for the mesh character entity object.
     * @param avatarLabelOffset Offset for the avatar label.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param isSize Whether or not the scale parameter is a size.
     * @param tag Tag of the character entity.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created character entity object.
     * @returns The character entity object.
     */
    static Create(parent: BaseEntity?, meshObject: string, meshResources: string[], meshOffset: Vector3, meshRotation: Quaternion, avatarLabelOffset: Vector3, position: Vector3, rotation: Quaternion, scale: Vector3, isSize?: boolean, tag?: string, id?: string, onLoaded?: string): CharacterEntity;

    /**
     * Create a character entity from a JSON string.
     * @param jsonEntity JSON string containing the character entity configuration.
     * @param parent Parent entity for the character entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created character entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Set the character model.
     * @param meshObject The new character model to use.
     * @param meshOffset The offset to apply.
     * @param meshRotation The rotation to apply.
     * @param labelOffset The offset to apply to the label.
     * @returns Whether or not the setting was successful.
     */
    SetCharacterModel(meshObject: string, meshOffset: Vector3, meshRotation: Quaternion, labelOffset: Vector3): boolean;

    /**
     * Set the character model offset.
     * @param newOffset The new offset to apply.
     * @param synchronize Whether or not to synchronize the change.
     * @returns Whether or not the setting was successful.
     */
    SetCharacterModelOffset(newOffset: Vector3, synchronize?: boolean): boolean;

    /**
     * Set the character model rotation.
     * @param newRotation The new rotation to apply.
     * @param synchronize Whether or not to synchronize the change.
     * @returns Whether or not the setting was successful.
     */
    SetCharacterModelRotation(newRotation: Quaternion, synchronize?: boolean): boolean;

    /**
     * Set the character label offset.
     * @param newOffset The new offset to apply.
     * @param synchronize Whether or not to synchronize the change.
     * @returns Whether or not the setting was successful.
     */
    SetCharacterLabelOffset(newOffset: Vector3, synchronize?: boolean): boolean;

    /**
     * Apply motion to the character entity with the given vector.
     * @param amount Amount to move the character entity.
     * @returns Whether or not the operation was successful.
     */
    Move(amount: Vector3): boolean;

    /**
     * Apply a jump to the character entity by the given amount.
     * @param amount Amount to jump the character entity.
     * @returns Whether or not the operation was successful.
     */
    Jump(amount: number): boolean;

    /**
     * Returns whether or not the character entity is on a surface.
     * @returns Whether or not the character entity is on a surface.
     */
    IsOnSurface(): boolean;

    /**
     * Set the visibility of the entity.
     * @param visible Whether or not to make entity visible.
     * @param synchronize Whether or not to synchronize the setting.
     * @returns Whether or not the operation was successful.
     */
    SetVisibility(visible: boolean, synchronize?: boolean): boolean;
}

/**
 * Class for a container entity.
 */
declare class ContainerEntity extends BaseEntity {
    /** Constructor for container entity. */
    constructor();

    /**
     * Create a container entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param isSize Whether or not the scale parameter is a size.
     * @param tag Tag of the container entity.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created container entity object.
     * @returns The container entity object.
     */
    static Create(
        parent: BaseEntity | null,
        position: Vector3,
        rotation: Quaternion,
        scale: Vector3,
        isSize?: boolean,
        tag?: string | null,
        id?: string | null,
        onLoaded?: string | null
    ): ContainerEntity;

    /**
     * Create a container entity from a JSON string.
     * @param jsonEntity JSON string containing the container entity configuration.
     * @param parent Parent entity for the container entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created container entity as a parameter.
     */
    static Create(
        jsonEntity: string,
        parent?: BaseEntity | null,
        onLoaded?: string | null
    ): void;
}

/**
 * Class for a dropdown entity.
 */
declare class DropdownEntity extends BaseEntity {
    /** Constructor for dropdown entity. */
    constructor();

    /**
     * Create a dropdown entity.
     * @param parent Parent canvas of the entity to create.
     * @param onChange Action to perform on dropdown change. Takes integer parameter which corresponds to index of selected option.
     * @param positionPercent Position of the entity within its canvas.
     * @param sizePercent Size of the entity relative to its canvas.
     * @param options Options to apply to the dropdown entity.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created dropdown entity object.
     * @returns The dropdown entity object.
     */
    static Create(parent: CanvasEntity, onChange: string, positionPercent: Vector2, sizePercent: Vector2, options?: string[], id?: string, tag?: string, onLoaded?: string): DropdownEntity;

    /**
     * Create a dropdown entity from a JSON string.
     * @param jsonEntity JSON string containing the dropdown entity configuration.
     * @param parent Parent entity for the dropdown entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created dropdown entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Set the onChange event for the dropdown entity.
     * @param onChange Action to perform on change.
     * @returns Whether or not the setting was successful.
     */
    SetOnChange(onChange: string): boolean;

    /**
     * Set the background image for the dropdown entity.
     * @param imagePath Path to the image to set the background to.
     * @returns Whether or not the setting was successful.
     */
    SetBackground(imagePath: string): boolean;

    /**
     * Set the base color for the dropdown entity.
     * @param color Color to set the dropdown entity to.
     * @returns Whether or not the setting was successful.
     */
    SetBaseColor(color: Color): boolean;

    /**
     * Set the colors for the dropdown entity.
     * @param defaultColor Color to set the default color for the dropdown entity to.
     * @param hoverColor Color to set the hover color for the dropdown entity to.
     * @param clickColor Color to set the click color for the dropdown entity to.
     * @param inactiveColor Color to set the inactive color for the dropdown entity to.
     * @returns Whether or not the setting was successful.
     */
    SetColors(defaultColor: Color, hoverColor: Color, clickColor: Color, inactiveColor: Color): boolean;

    /**
     * Add an option to the dropdown entity.
     * @param option Option to add.
     * @returns Index of added option, or -1 on failure.
     */
    AddOption(option: string): number;

    /**
     * Clear options from the dropdown entity.
     * @returns Whether or not the operation was successful.
     */
    ClearOptions(): boolean;

    /**
     * Stretch the dropdown entity to fill its parent.
     * @param stretch Whether to stretch to parent. If false, restores normal sizing.
     * @returns Whether or not the operation was successful.
     */
    StretchToParent(stretch?: boolean): boolean;

    /**
     * Set the alignment of the dropdown entity within its parent.
     * @param alignment Alignment to set.
     * @returns Whether or not the operation was successful.
     */
    SetAlignment(alignment: UIElementAlignment): boolean;
}

/**
 * Class for an HTML entity.
 */
declare class HTMLEntity extends BaseEntity {
    /** Constructor for HTML entity. */
    constructor();

    /**
     * Create an HTML entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param isSize Whether or not the scale parameter is a size.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onMessage Action to invoke upon receiving a world message.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created HTML entity object.
     * @returns The HTML entity object.
     */
    static Create(parent: BaseEntity?, position: Vector3, rotation: Quaternion, scale: Vector3, isSize?: boolean, id?: string, tag?: string, onMessage?: string, onLoaded?: string): HTMLEntity;

    /**
     * Create an HTML entity.
     * @param parent Parent of the entity to create.
     * @param positionPercent Position of the entity as a percentage of its parent canvas.
     * @param sizePercent Size of the entity as a percentage of its parent canvas.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onMessage Action to invoke upon receiving a world message.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created HTML entity object.
     * @returns The HTML entity object.
     */
    static Create(parent: BaseEntity?, positionPercent: Vector2, sizePercent: Vector2, id?: string, tag?: string, onMessage?: string, onLoaded?: string): HTMLEntity;

    /**
     * Create an HTML entity from a JSON string.
     * @param jsonEntity JSON string containing the HTML entity configuration.
     * @param parent Parent entity for the HTML entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created HTML entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Load content from a URL.
     * @param url URL to load content from.
     * @returns Whether or not the setting was successful.
     */
    LoadFromURL(url: string): boolean;

    /**
     * Load HTML content.
     * @param html HTML content to load.
     * @returns Whether or not the setting was successful.
     */
    LoadHTML(html: string): boolean;

    /**
     * Get the current URL.
     * @returns The current URL, or null.
     */
    GetURL(): string | null;

    /**
     * Execute JavaScript logic.
     * @param logic Logic to execute.
     * @param onComplete Action to invoke upon completion. Provides return from JavaScript as string.
     * @returns Whether or not the operation was successful.
     */
    ExecuteJavaScript(logic: string, onComplete: string): boolean;
}

/**
 * Class for an image entity.
 */
/**
 * Class for an image entity.
 */
declare class ImageEntity extends BaseEntity {
    /** Constructor for image entity. */
    constructor();

    /**
     * Create an image entity.
     * @param parent Parent canvas of the entity to create.
     * @param imageFile Path to image file to apply to the new image entity.
     * @param positionPercent Position of the entity within its canvas.
     * @param sizePercent Size of the entity relative to its canvas.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created image entity object.
     * @returns The image entity object.
     */
    static Create(parent: BaseEntity?, imageFile: string, positionPercent: Vector2, sizePercent: Vector2, id?: string, tag?: string, onLoaded?: string): ImageEntity;

    /**
     * Create an image entity from a JSON string.
     * @param jsonEntity JSON string containing the image entity configuration.
     * @param parent Parent entity for the image entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created image entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Stretch the image entity to fill its parent.
     * @param stretch Whether to stretch to parent. If false, restores normal sizing.
     * @returns Whether or not the operation was successful.
     */
    StretchToParent(stretch?: boolean): boolean;

    /**
     * Set the alignment of the image entity within its parent.
     * @param alignment Alignment to set.
     * @returns Whether or not the operation was successful.
     */
    SetAlignment(alignment: UIElementAlignment): boolean;
}

/**
 * Class for an input entity.
 */
declare class InputEntity extends BaseEntity {
    /** Constructor for input entity. */
    constructor();

    /**
     * Create an input entity.
     * @param parent Parent canvas of the entity to create.
     * @param positionPercent Position of the entity within its canvas.
     * @param sizePercent Size of the entity relative to its canvas.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created input entity object.
     * @returns The input entity object.
     */
    static Create(parent: CanvasEntity, positionPercent: Vector2, sizePercent: Vector2, id?: string, tag?: string, onLoaded?: string): InputEntity;

    /**
     * Create an input entity from a JSON string.
     * @param jsonEntity JSON string containing the input entity configuration.
     * @param parent Parent entity for the input entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created input entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Get the text for the input entity.
     * @returns Text of the input entity.
     */
    GetText(): string | null;

    /**
     * Set the text for the input entity.
     * @param text Text for the input entity.
     * @returns Whether or not the operation was successful.
     */
    SetText(text: string): boolean;
}

/**
 * Class for a light entity.
 */
declare class LightEntity extends BaseEntity {
    /** Constructor for light entity. */
    constructor();

    /**
     * Create a light entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created light entity object.
     * @returns The light entity object.
     */
    static Create(parent: BaseEntity?, position: Vector3, rotation: Quaternion, id?: string, tag?: string, onLoaded?: string): LightEntity;

    /**
     * Create a light entity from a JSON string.
     * @param jsonEntity JSON string containing the light entity configuration.
     * @param parent Parent entity for the light entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created light entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Set the light type for the light entity.
     * @param type Light type to apply.
     * @returns Whether or not the setting was successful.
     */
    SetLightType(type: LightType): boolean;

    /**
     * Set the properties for the light.
     * @param color Color to apply to the light.
     * @param temperature Temperature to apply to the light.
     * @param intensity Intensity to apply to the light.
     * @returns Whether or not the setting was successful.
     */
    SetLightProperties(color: Color, temperature: number, intensity: number): boolean;

    /**
     * Set the properties for the light.
     * @param range Range to apply to the light.
     * @param innerSpotAngle Inner spot angle to apply to the light.
     * @param outerSpotAngle Outer spot angle to apply to the light.
     * @param color Color to apply to the light.
     * @param temperature Temperature to apply to the light.
     * @param intensity Intensity to apply to the light.
     * @returns Whether or not the setting was successful.
     */
    SetLightProperties(range: number, innerSpotAngle: number, outerSpotAngle: number, color: Color, temperature: number, intensity: number): boolean;

    /**
     * Set the properties for the light.
     * @param range Range to apply to the light.
     * @param intensity Intensity to apply to the light.
     * @returns Whether or not the setting was successful.
     */
    SetLightProperties(range: number, intensity: number): boolean;

    /**
     * Get the properties for the light.
     * @returns The light properties of the light.
     */
    GetLightProperties(): LightProperties;
}

/**
 * Class for a mesh entity.
 */
/**
 * Class for a mesh entity.
 */
declare class MeshEntity extends BaseEntity {
    /** Constructor for mesh entity. */
    constructor();

    /**
     * Create a mesh entity.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     * @returns The mesh entity object.
     */
    static Create(parent: BaseEntity?, meshObject: string, meshResources: string[], position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): MeshEntity;

    /**
     * Create a mesh entity.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param isSize Whether or not to use size instead of scale.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     * @returns The mesh entity object.
     */
    static Create(parent: BaseEntity?, meshObject: string, meshResources: string[], position: Vector3, rotation: Quaternion, scale: Vector3, isSize: boolean, id?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): MeshEntity;


    /**
     * Create a mesh entity from a JSON string.
     * @param jsonEntity JSON string containing the mesh entity configuration.
     * @param parent Parent entity for the mesh entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created mesh entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Queue create a mesh entity synchronously.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     */
    static QueueCreate(parent: BaseEntity?, meshObject: string, meshResources: string[], position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): void;

    /**
     * Queue create a mesh entity synchronously.
     * @param parent Parent of the entity to create.
     * @param meshObject Path to the mesh object to load for this entity.
     * @param meshResources Paths to mesh resources for this entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param isSize Whether or not to use size instead of scale.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @param checkForUpdateIfCached Whether or not to check for update if in cache.
     */
    static QueueCreate(parent: BaseEntity?, meshObject: string, meshResources: string[], position: Vector3, rotation: Quaternion, scale: Vector3, isSize?: boolean, id?: string, onLoaded?: string, checkForUpdateIfCached?: boolean): void;

    /**
     * Create a mesh entity collection from a JSON string.
     * @param jsonEntity JSON string containing the mesh entity collection configuration.
     * @param parent Parent entity for the mesh entities. If null, the entities will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entities are created. The callback will receive an array of created mesh entities as a parameter.
     */
    static CreateCollection(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Create a cube primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateCube(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a sphere primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateSphere(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a capsule primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateCapsule(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a cylinder primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateCylinder(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a plane primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreatePlane(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a torus primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateTorus(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a cone primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateCone(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a rectangular pyramid primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateRectangularPyramid(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a tetrahedron primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateTetrahedron(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create a prism primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreatePrism(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;

    /**
     * Create an arch primitive mesh entity.
     * @param parent Parent of the entity to create.
     * @param color Color to apply to the mesh entity.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created mesh entity object.
     * @returns The mesh entity object.
     */
    static CreateArch(parent: BaseEntity, color: Color, position: Vector3, rotation: Quaternion, id?: string, onLoaded?: string): MeshEntity;
}

/**
 * Class for a terrain entity.
 */
declare class TerrainEntity extends BaseEntity {
    /** Constructor for terrain entity. */
    constructor();

    /**
     * Create a heightmap terrain entity.
     * @param parent Parent of the entity to create.
     * @param length Length of the terrain in terrain units.
     * @param width Width of the terrain in terrain units.
     * @param height Height of the terrain in terrain units.
     * @param heights 2D array of heights for the terrain.
     * @param layers Layers for the terrain.
     * @param layerMasks Layer masks for the terrain.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created terrain entity object.
     * @param stitchTerrains Whether to stitch terrains.
     * @returns The heightmap terrain entity object.
     */
    static CreateHeightmap(parent: BaseEntity, length: number, width: number, height: number, heights: number[][], layers: TerrainEntityLayer[], layerMasks: TerrainEntityLayerMaskCollection, position: Vector3, rotation: Quaternion, id?: string, tag?: string, onLoaded?: string, stitchTerrains?: boolean): TerrainEntity;

    /**
     * Create a hybrid terrain entity.
     * @param parent Parent of the entity to create.
     * @param length Length of the terrain in terrain units.
     * @param width Width of the terrain in terrain units.
     * @param height Height of the terrain in terrain units.
     * @param heights 2D array of heights for the terrain.
     * @param layers Layers for the terrain.
     * @param layerMasks Layer masks for the terrain.
     * @param modifications Modifications for the terrain.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created terrain entity object.
     * @param stitchTerrains Whether to stitch terrains.
     * @returns The hybrid terrain entity object.
     */
    static CreateHybrid(parent: BaseEntity, length: number, width: number, height: number, heights: number[][], layers: TerrainEntityLayer[], layerMasks: TerrainEntityLayerMaskCollection, modifications: TerrainEntityModification[], position: Vector3, rotation: Quaternion, id?: string, tag?: string, onLoaded?: string, stitchTerrains?: boolean): TerrainEntity;

    /**
     * Create a terrain entity from a JSON string.
     * @param jsonEntity JSON string containing the terrain entity configuration.
     * @param parent Parent entity for the terrain entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created terrain entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Build on the terrain entity. Only valid for hybrid terrain entities.
     * @param position Position at which to build.
     * @param brushType Type of brush to use.
     * @param layer Layer to build on.
     * @param size Size of the addition, in meters.
     * @param synchronizeChange Whether or not to synchronize the change.
     * @returns Whether or not the operation was successful.
     */
    Build(position: Vector3, brushType: TerrainEntityBrushType, layer: number, size?: number, synchronizeChange?: boolean): boolean;

    /**
     * Dig on the terrain entity. Only valid for hybrid terrain entities.
     * @param position Position at which to dig.
     * @param brushType Type of brush to use.
     * @param layer Layer to dig on.
     * @param size Size of the hole, in meters.
     * @param synchronizeChange Whether or not to synchronize the change.
     * @returns Whether or not the operation was successful.
     */
    Dig(position: Vector3, brushType: TerrainEntityBrushType, layer: number, size: number, synchronizeChange?: boolean): boolean;

    /**
     * Get the height at a given x and y index.
     * @param xIndex X index at which to get the height.
     * @param yIndex Y index at which to get the height.
     * @returns The height at the given x and y index.
     */
    GetHeight(xIndex: number, yIndex: number): number;

    /**
     * Get the layer mask for a given terrain entity layer.
     * @param index Index for which to get the layer mask.
     * @returns A layer mask (a 2d array of values between 0 and 1 corresponding to the intensity of the given layer).
     */
    GetLayerMask(index: number): number[][] | null;

    /**
     * Get the block at a given position.
     * @param position Position to get the block at.
     * @returns Block at the given position (array containing the operation (as a string) and layer index (as an int)). Operations: build, dig, unset.
     */
    GetBlockAtPosition(position: Vector3): any[] | null;

    /**
     * Get all modifications for the terrain.
     * @returns All modifications for the terrain.
     */
    GetModifications(): TerrainEntityModification[] | null;
}

/**
 * Class for a text entity.
 */
declare class TextEntity extends BaseEntity {
    /** Constructor for text entity. */
    constructor();

    /**
     * Create a text entity.
     * @param parent Parent canvas of the entity to create.
     * @param text Text to apply to the new text entity.
     * @param fontSize Font size to apply to the new text entity.
     * @param positionPercent Position of the entity within its canvas.
     * @param sizePercent Size of the entity relative to its canvas.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created text entity object.
     * @returns The text entity object.
     */
    static Create(parent: BaseEntity?, text: string, fontSize: number, positionPercent: Vector2, sizePercent: Vector2, id?: string, tag?: string, onLoaded?: string): TextEntity;

    /**
     * Create a text entity from a JSON string.
     * @param jsonEntity JSON string containing the text entity configuration.
     * @param parent Parent entity for the text entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created text entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Get the text for the text entity.
     * @returns The text for the text entity.
     */
    GetText(): string | null;

    /**
     * Set the text for the text entity.
     * @param text Text to apply to the text entity.
     * @returns Whether or not the operation was successful.
     */
    SetText(text: string): boolean;

    /**
     * Get the font size for the text entity.
     * @returns The font size for the text entity.
     */
    GetFontSize(): number;

    /**
     * Set the font size for the text entity.
     * @param size Size to apply to the text entity.
     * @returns Whether or not the operation was successful.
     */
    SetFontSize(size: number): boolean;

    /**
     * Get the color for the text entity.
     * @returns The color for the text entity.
     */
    GetColor(): Color | null;

    /**
     * Set the color for the text entity.
     * @param color Color to apply to the text entity.
     * @returns Whether or not the operation was successful.
     */
    SetColor(color: Color): boolean;

    /**
     * Set the margins for the text entity.
     * @param margins Margins to apply to the text entity.
     * @returns Whether or not the operation was successful.
     */
    SetMargins(margins: Vector4): boolean;

    /**
     * Get the margins for the text entity.
     * @returns The margins for the text entity.
     */
    GetMargins(): Vector4 | null;

    /**
     * Set the font for the text entity.
     * @param fontName Name of the font to apply.
     * @returns Whether or not the operation was successful.
     */
    SetFont(fontName: string): boolean;

    /**
     * Get the current font name for the text entity.
     * @returns The current font name.
     */
    GetFont(): string | null;

    /**
     * Set the bold style for the text entity.
     * @param bold Whether to enable bold.
     * @returns Whether or not the operation was successful.
     */
    SetBold(bold: boolean): boolean;

    /**
     * Get whether the text entity is bold.
     * @returns Whether the text is bold.
     */
    GetBold(): boolean;

    /**
     * Set the italic style for the text entity.
     * @param italic Whether to enable italic.
     * @returns Whether or not the operation was successful.
     */
    SetItalic(italic: boolean): boolean;

    /**
     * Get whether the text entity is italic.
     * @returns Whether the text is italic.
     */
    GetItalic(): boolean;

    /**
     * Set the underline style for the text entity.
     * @param underline Whether to enable underline.
     * @returns Whether or not the operation was successful.
     */
    SetUnderline(underline: boolean): boolean;

    /**
     * Get whether the text entity is underlined.
     * @returns Whether the text is underlined.
     */
    GetUnderline(): boolean;

    /**
     * Set the strikethrough style for the text entity.
     * @param strikethrough Whether to enable strikethrough.
     * @returns Whether or not the operation was successful.
     */
    SetStrikethrough(strikethrough: boolean): boolean;

    /**
     * Get whether the text entity has strikethrough.
     * @returns Whether the text has strikethrough.
     */
    GetStrikethrough(): boolean;

    /**
     * Set the text alignment for the text entity.
     * @param alignment Text alignment to set.
     * @returns Whether or not the operation was successful.
     */
    SetTextAlignment(alignment: TextAlignment): boolean;

    /**
     * Get the text alignment for the text entity.
     * @returns The current text alignment.
     */
    GetTextAlignment(): TextAlignment;

    /**
     * Set the text wrapping for the text entity.
     * @param wrapping Text wrapping to set.
     * @returns Whether or not the operation was successful.
     */
    SetTextWrapping(wrapping: TextWrapping): boolean;

    /**
     * Get the text wrapping for the text entity.
     * @returns The current text wrapping setting.
     */
    GetTextWrapping(): TextWrapping;

    /**
     * Stretch the text entity to fill its parent.
     * @param stretch Whether to stretch to parent. If false, restores normal sizing.
     * @returns Whether or not the operation was successful.
     */
    StretchToParent(stretch?: boolean): boolean;

    /**
     * Set the alignment of the text entity within its parent.
     * @param alignment Alignment to set.
     * @returns Whether or not the operation was successful.
     */
    SetAlignment(alignment: UIElementAlignment): boolean;
}

/**
 * Class for a voxel entity.
 */
/**
 * Class for a voxel entity.
 */
declare class VoxelEntity extends BaseEntity {
    /** Constructor for voxel entity. */
    constructor();

    /**
     * Create a voxel entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created voxel entity object.
     * @returns The voxel entity object.
     */
    static Create(parent: BaseEntity?, position: Vector3, rotation: Quaternion, scale: Vector3, id?: string, tag?: string, onLoaded?: string): VoxelEntity;

    /**
     * Create a voxel entity from a JSON string.
     * @param jsonEntity JSON string containing the voxel entity configuration.
     * @param parent Parent entity for the voxel entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created voxel entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Set the blockinfo for a given block with an ID.
     * @param id ID of the block.
     * @param info Info for the block.
     * @returns Whether or not the operation was successful.
     */
    SetBlockInfo(id: number, info: VoxelBlockInfo): boolean;

    /**
     * Set the block at a given coordinate.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param z Z coordinate.
     * @param type Block type at coordinate.
     * @param subType Block subtype at coordinate.
     * @returns Whether or not the operation was successful.
     */
    SetBlock(x: number, y: number, z: number, type: number, subType: number): boolean;

    /**
     * Get the block at a given coordinate.
     * @param x X coordinate.
     * @param y Y coordinate.
     * @param z Z coordinate.
     * @returns Integer array with the first element being the block type, and the second being the block subtype.
     */
    GetBlock(x: number, y: number, z: number): number[] | null;

    /**
     * Whether or not the voxel entity contains a given chunk.
     * @param x X index of the chunk.
     * @param y Y index of the chunk.
     * @param z Z index of the chunk.
     * @returns Whether or not the chunk exists.
     */
    ContainsChunk(x: number, y: number, z: number): boolean;
}

/**
 * Class for a water blocker entity.
 */
/**
 * Class for a water blocker entity.
 */
declare class WaterBlockerEntity extends BaseEntity {
    /** Constructor for water blocker entity. */
    constructor();

    /**
     * Create a water blocker entity.
     * @param parent Parent of the entity to create.
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created water blocker entity object.
     * @returns The water blocker entity object.
     */
    static CreateWaterBlocker(parent: BaseEntity, position: Vector3, rotation: Quaternion, scale: Vector3, id?: string, tag?: string, onLoaded?: string): WaterBlockerEntity;

    /**
     * Create a water blocker entity from a JSON string.
     * @param jsonEntity JSON string containing the water blocker entity configuration.
     * @param parent Parent entity for the water blocker entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created water blocker entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;
}

/**
 * Class for a water entity.
 */
declare class WaterEntity extends BaseEntity {
    /** Constructor for water entity. */
    constructor();

    /**
     * Create a water entity.
     * @param parent Parent of the entity to create.
     * @param shallowColor Color for the shallow zone.
     * @param deepColor Color for the deep zone.
     * @param specularColor Specular color.
     * @param scatteringColor Scattering color.
     * @param deepStart Start of deep zone.
     * @param deepEnd End of deep zone.
     * @param distortion Distortion factor (range 0-128).
     * @param smoothness Smoothness factor (range 0-1).
     * @param numWaves Number of waves (range 1-32).
     * @param waveAmplitude Wave amplitude (range 0-1).
     * @param waveSteepness Wave steepness (range 0-1).
     * @param waveSpeed Wave speed.
     * @param waveLength Wave length.
     * @param waveScale Scale of the waves.
     * @param intensity Intensity factor (range 0-1).
     * @param position Position of the entity relative to its parent.
     * @param rotation Rotation of the entity relative to its parent.
     * @param scale Scale of the entity relative to its parent.
     * @param id ID of the entity. One will be created if not provided.
     * @param tag Tag of the entity.
     * @param onLoaded Action to perform on load. This takes a single parameter containing the created water entity object.
     * @returns The water entity object.
     */
    static CreateWaterBody(parent: BaseEntity?, shallowColor: Color, deepColor: Color, specularColor: Color, scatteringColor: Color, deepStart: number, deepEnd: number, distortion: number, smoothness: number, numWaves: number, waveAmplitude: number, waveSteepness: number, waveSpeed: number, waveLength: number, waveScale: number, intensity: number, position: Vector3, rotation: Quaternion, scale: Vector3, id?: string, tag?: string, onLoaded?: string): WaterEntity;

    /**
     * Create a water entity from a JSON string.
     * @param jsonEntity JSON string containing the water entity configuration.
     * @param parent Parent entity for the water entity. If null, the entity will be created at the world root.
     * @param onLoaded JavaScript callback function to execute when the entity is created. The callback will receive the created water entity as a parameter.
     */
    static Create(jsonEntity: string, parent?: BaseEntity, onLoaded?: string): void;

    /**
     * Set properties for the water body.
     * @param shallowColor Color for the shallow zone.
     * @param deepColor Color for the deep zone.
     * @param specularColor Specular color.
     * @param scatteringColor Scattering color.
     * @param deepStart Start of deep zone.
     * @param deepEnd End of deep zone.
     * @param distortion Distortion factor (range 0-128).
     * @param smoothness Smoothness factor (range 0-1).
     * @param numWaves Number of waves (range 1-32).
     * @param waveAmplitude Wave amplitude (range 0-1).
     * @param waveSteepness Wave steepness (range 0-1).
     * @param waveSpeed Wave speed.
     * @param waveLength Wave length.
     * @param scale Scale of the waves.
     * @param intensity Intensity factor (range 0-1).
     * @returns Whether or not the operation was successful.
     */
    SetProperties(shallowColor: Color, deepColor: Color, specularColor: Color, scatteringColor: Color, deepStart: number, deepEnd: number, distortion: number, smoothness: number, numWaves: number, waveAmplitude: number, waveSteepness: number, waveSpeed: number, waveLength: number, scale: number, intensity: number): boolean;
}

// ============================================================================
// Networking
// ============================================================================

/**
 * Class for HTTP networking.
 */
declare class HTTPNetworking {
    /**
     * Fetch request options struct.
     */
    static FetchRequestOptions: {
        /** Request body. */
        body: string;
        /** Cache mode. */
        cache: string;
        /** Credentials mode. */
        credentials: string;
        /** Request headers. */
        headers: string[];
        /** Keep alive flag. */
        keepalive: boolean;
        /** HTTP method (GET, POST, PUT, DELETE, PATCH, MERGE, OPTIONS, CONNECT, QUERY). */
        method: string;
        /** Request mode. */
        mode: string;
        /** Request priority. */
        priority: string;
        /** Redirect mode. */
        redirect: string;
        /** Referrer. */
        referrer: string;
        /** Referrer policy. */
        referrerPolicy: string;
    };

    /**
     * Class for HTTP request.
     */
    static Request: {
        /** Body. */
        body: string;
        /** Cache. */
        cache: string;
        /** Credentials. */
        credentials: string;
        /** Headers. */
        headers: string[];
        /** Keepalive. */
        keepalive: boolean;
        /** Integrity. */
        integrity: string;
        /** HTTP Method to use (GET, POST, PUT, DELETE, PATCH, MERGE, OPTIONS, CONNECT, QUERY). */
        method: string;
        /** Mode. */
        mode: string;
        /** Priority. */
        priority: string;
        /** Redirect. */
        redirect: string;
        /** Referrer. */
        referrer: string;
        /** Referrer Policy. */
        referrerPolicy: string;
        /** Resource URIs. */
        resourceURI: string;

        /**
         * Constructor for an HTTP Request.
         * @param input URI to use.
         */
        new(input: string): HTTPNetworking.Request;

        /**
         * Constructor for an HTTP Request.
         * @param input URI to use.
         * @param options Fetch Request Options.
         */
        new(input: string, options: HTTPNetworking.FetchRequestOptions): HTTPNetworking.Request;
    };

    /**
     * Class for an HTTP Response.
     */
    static Response: {
        /** Status code. */
        status: number;
        /** Status text. */
        statusText: string;
        /** Data. */
        data: Uint8Array;

        /**
         * Constructor for an HTTP Response.
         * @param status Status code.
         * @param statusText Status text.
         * @param data Data.
         */
        new(status: number, statusText: string, data: Uint8Array): HTTPNetworking.Response;
    };

    /**
     * Perform a Fetch.
     * @param resource URI of the resource to fetch.
     * @param onFinished Logic to execute when the request has finished.
     */
    static Fetch(resource: string, onFinished: string): void;

    /**
     * Perform a Fetch.
     * @param resource URI of the resource to fetch.
     * @param options Fetch Request Options.
     * @param onFinished Logic to execute when the request has finished.
     */
    static Fetch(resource: string, options: HTTPNetworking.FetchRequestOptions, onFinished: string): void;

    /**
     * Perform a Fetch.
     * @param request Request to fetch.
     * @param onFinished Logic to execute when the request has finished.
     * @param data Optional data to send.
     * @param dataType Optional data type.
     */
    static Fetch(request: HTTPNetworking.Request, onFinished: string, data?: string, dataType?: string): void;

    /**
     * Perform a POST request.
     * @param resource URI of the resource to fetch.
     * @param data Data to post.
     * @param dataType Data type.
     * @param onFinished Logic to execute when the request has finished.
     */
    static Post(resource: string, data: string, dataType: string, onFinished: string): void;
}

/**
 * Class for MQTT client (available when USE_WEBINTERFACE is defined).
 */
declare class MQTTClient {
    /** Constructor for MQTT client. */
    constructor();

    /**
     * Connect to MQTT broker.
     * @param host Broker host.
     * @param port Broker port.
     * @param clientId Client ID.
     * @param onConnect Callback function name for connection.
     */
    Connect(host: string, port: number, clientId: string, onConnect: string): void;

    /**
     * Disconnect from MQTT broker.
     */
    Disconnect(): void;

    /**
     * Subscribe to a topic.
     * @param topic Topic to subscribe to.
     * @param onMessage Callback function name for messages.
     */
    Subscribe(topic: string, onMessage: string): void;

    /**
     * Unsubscribe from a topic.
     * @param topic Topic to unsubscribe from.
     */
    Unsubscribe(topic: string): void;

    /**
     * Publish a message.
     * @param topic Topic to publish to.
     * @param message Message to publish.
     */
    Publish(topic: string, message: string): void;
}

/**
 * Class for WebSocket (available when USE_WEBINTERFACE is defined).
 */
declare class WebSocket {
    /**
     * Constructor for WebSocket.
     * @param url WebSocket URL.
     */
    constructor(url: string);

    /**
     * Send data through the WebSocket.
     * @param data Data to send.
     */
    Send(data: string): void;

    /**
     * Close the WebSocket.
     */
    Close(): void;

    /**
     * Set the onopen callback.
     * @param callback Callback function name.
     */
    SetOnOpen(callback: string): void;

    /**
     * Set the onmessage callback.
     * @param callback Callback function name.
     */
    SetOnMessage(callback: string): void;

    /**
     * Set the onerror callback.
     * @param callback Callback function name.
     */
    SetOnError(callback: string): void;

    /**
     * Set the onclose callback.
     * @param callback Callback function name.
     */
    SetOnClose(callback: string): void;
}

// ============================================================================
// Input
// ============================================================================

/**
 * VR pointer mode enum.
 */
declare enum VRPointerMode {
    None = 0,
    Teleport = 1,
    UI = 2
}

/**
 * VR turn locomotion mode enum.
 */
declare enum VRTurnLocomotionMode {
    None = 0,
    Smooth = 1,
    Snap = 2
}

// ============================================================================
// Input
// ============================================================================

/**
 * VR pointer mode enum.
 */
declare enum VRPointerMode {
    None = 0,
    Teleport = 1,
    UI = 2
}

/**
 * VR turn locomotion mode enum.
 */
declare enum VRTurnLocomotionMode {
    None = 0,
    Smooth = 1,
    Snap = 2
}

/**
 * Class for input methods.
 */
declare class Input {
    static VRPointerMode: typeof VRPointerMode;
    static VRTurnLocomotionMode: typeof VRTurnLocomotionMode;

    /** Whether or not VR is active. */
    static readonly IsVR: boolean;

    /**
     * Get the current move value.
     * @returns A Vector2 representation of the current move value.
     */
    static GetMoveValue(): Vector2;

    /**
     * Get the current look value.
     * @returns A Vector2 representation of the current look value.
     */
    static GetLookValue(): Vector2;

    /**
     * Get the current pressed state of a key.
     * @param key The key to check.
     * @returns Whether or not the key is pressed.
     */
    static GetKeyValue(key: string): boolean;

    /**
     * Get the current pressed state of a key by keycode.
     * @param keycode The keycode to check.
     * @returns Whether or not the key is pressed.
     */
    static GetKeyCodeValue(keycode: string): boolean;

    /**
     * Get the current pressed state of the left mouse button.
     * @returns Whether or not the left mouse button is pressed.
     */
    static GetLeft(): boolean;

    /**
     * Get the current pressed state of the middle mouse button.
     * @returns Whether or not the middle mouse button is pressed.
     */
    static GetMiddle(): boolean;

    /**
     * Get the current pressed state of the right mouse button.
     * @returns Whether or not the right mouse button is pressed.
     */
    static GetRight(): boolean;

    /**
     * Get the current position of the left hand.
     * @returns Current position of the left hand, or Vector3.zero if it does not exist.
     */
    static GetLeftHandPosition(): Vector3;

    /**
     * Get the current position of the right hand.
     * @returns Current position of the right hand, or Vector3.zero if it does not exist.
     */
    static GetRightHandPosition(): Vector3;

    /**
     * Get the current rotation of the left hand.
     * @returns Current rotation of the left hand, or Quaternion.identity if it does not exist.
     */
    static GetLeftHandRotation(): Quaternion;

    /**
     * Get the current rotation of the right hand.
     * @returns Current rotation of the right hand, or Quaternion.identity if it does not exist.
     */
    static GetRightHandRotation(): Quaternion;

    /**
     * Get a raycast from the pointer.
     * @param direction Direction to cast the ray in.
     * @param pointerIndex Index of the pointer to get raycast from.
     * @returns A raycast from the pointer, or null.
     */
    static GetPointerRaycast(direction: Vector3, pointerIndex?: number): RaycastHitInfo | null;

    /** The pointer mode for the left hand. */
    static leftVRPointerMode: VRPointerMode;

    /** The pointer mode for the right hand. */
    static rightVRPointerMode: VRPointerMode;

    /** The poker mode for the left hand. */
    static leftVRPokerEnabled: boolean;

    /** The poker mode for the right hand. */
    static rightVRPokerEnabled: boolean;

    /** The interaction mode for the left hand. */
    static leftInteractionEnabled: boolean;

    /** The interaction mode for the right hand. */
    static rightInteractionEnabled: boolean;

    /** The turn locomotion mode. */
    static turnLocomotionMode: VRTurnLocomotionMode;

    /** The joystick motion mode. */
    static joystickMotionEnabled: boolean;

    /** The grab move mode for the left hand. */
    static leftGrabMoveEnabled: boolean;

    /** The grab move mode for the right hand. */
    static rightGrabMoveEnabled: boolean;

    /** The two-handed grab move mode. */
    static twoHandedGrabMoveEnabled: boolean;

    static gravityEnabled: boolean;

    static wasdMotionEnabled: boolean;

    static mouseLookEnabled: boolean;

    static jumpEnabled: boolean;

    static movementSpeed: number;

    static lookSpeed: number;

    /**
     * Add a rig follower (an entity that follows the rig).
     * @param entityToFollowRig Entity to follow the rig.
     * @returns Whether or not the operation was successful.
     */
    static AddRigFollower(entityToFollowRig: BaseEntity): boolean;

    /**
     * Add a left hand follower (an entity that follows the left hand).
     * @param entityToFollowLeftHand Entity to follow the left hand.
     * @returns Whether or not the operation was successful.
     */
    static AddLeftHandFollower(entityToFollowLeftHand: BaseEntity): boolean;

    /**
     * Add a right hand follower (an entity that follows the right hand).
     * @param entityToFollowRightHand Entity to follow the right hand.
     * @returns Whether or not the operation was successful.
     */
    static AddRightHandFollower(entityToFollowRightHand: BaseEntity): boolean;

    /**
     * Remove a rig follower (an entity that follows the rig).
     * @param entityToFollowRig Entity that follows the rig to remove.
     * @returns Whether or not the operation was successful.
     */
    static RemoveRigFollower(entityToFollowRig: BaseEntity): boolean;

    /**
     * Remove a left hand follower (an entity that follows the left hand).
     * @param entityToFollowLeftHand Entity that follows the left hand to remove.
     * @returns Whether or not the operation was successful.
     */
    static RemoveLeftHandFollower(entityToFollowLeftHand: BaseEntity): boolean;

    /**
     * Remove a right hand follower (an entity that follows the right hand).
     * @param entityToFollowRightHand Entity that follows the right hand to remove.
     * @returns Whether or not the operation was successful.
     */
    static RemoveRightHandFollower(entityToFollowRightHand: BaseEntity): boolean;

    // ============================================================
    // Desktop Control Methods
    // ============================================================

    /**
     * Set the avatar entity by tag for desktop input.
     * The avatar entity is the 3D model representing the player.
     * 
     * @param entityTag The tag of the entity to use as the avatar
     * @returns Whether or not the operation was successful
     * 
     * @example
     * ```typescript
     * // Set the player's avatar to an entity with tag "PlayerModel"
     * const success = Input.SetAvatarEntityByTag("PlayerModel");
     * if (success) {
     *     console.log("Avatar set successfully");
     * }
     * ```
     */
    static SetAvatarEntityByTag(entityTag: string): boolean;

    /**
     * Set the rig offset from a string for desktop input.
     * The rig offset adjusts the position of the player's viewpoint relative to the avatar.
     * 
     * @param rigOffsetString The rig offset string in format "x,y,z" (e.g., "0,1.6,0")
     * @returns Whether or not the operation was successful
     * 
     * @example
     * ```typescript
     * // Set rig offset to 1.6 units above the avatar (eye level)
     * const success = Input.SetRigOffset(new Vector3(0, 1.6, 0));
     * if (success) {
     *     console.log("Rig offset applied");
     * }
     * ```
     */
    static SetRigOffset(rigOffset: Vector3): boolean;
}

// ============================================================================
// Environment
// ============================================================================

/**
 * Class for environment manipulation.
 */
declare class Environment {
    /**
     * Set the offset for the world.
     * @param worldOffset World offset.
     */
    static SetWorldOffset(worldOffset: Vector3): void;

    /**
     * Get the offset for the world.
     * @returns World offset.
     */
    static GetWorldOffset(): Vector3;

    /**
     * Set the threshold for updating world offset.
     * @param threshold Threshold distance.
     */
    static SetWorldOffsetUpdateThreshold(threshold: number): void;

    /**
     * Get the threshold for updating world offset.
     * @returns Threshold distance.
     */
    static GetWorldOffsetUpdateThreshold(): number;

    /**
     * Set the character entity to track for the camera.
     * @param entity Character entity to track, or null to stop tracking.
     */
    static SetTrackedCharacterEntity(entity: BaseEntity | null): void;

    /**
     * Set the sky to a texture.
     * @param skyTextureURI URI of the texture to set the sky to.
     */
    static SetSkyTexture(skyTextureURI: string): void;

    /**
     * Set the sky to a solid color.
     * @param color Color to set the sky to.
     * @returns Whether or not the operation was successful.
     */
    static SetSolidColorSky(color: Color): boolean;

    /**
     * Set the sky to lite-mode day/night procedural with default settings.
     * @param sunEntity Entity to use for the sun.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteDayNightSky(sunEntity: LightEntity): boolean;

    /**
     * Set the sky to lite-mode day/night procedural with basic settings.
     * @param sunEntity Entity to use for the sun.
     * @param enableGround Whether or not to enable procedural ground.
     * @param groundColor Color for the ground.
     * @param groundHeight Height to place ground at.
     * @param dayHorizonColor Color for horizon during day.
     * @param daySkyColor Color for sky during day.
     * @param nightHorizonColor Color for horizon during night.
     * @param nightSkyColor Color for sky during night.
     * @param enableSun Whether or not to enable procedural sun.
     * @param sunDiameter Diameter of sun.
     * @param sunColor Color of sun.
     * @param enableMoon Whether or not to enable procedural moon.
     * @param moonDiameter Diameter of moon.
     * @param moonColor Color of moon.
     * @param enableStars Whether or not to enable stars.
     * @param starsBrightness Brightness for stars.
     * @param starRotationSpeed Rotation speed for non-procedural stars.
     * @param enableClouds Whether or not to enable procedural clouds.
     * @param cloudsSpeed Speed for clouds.
     * @param cloudiness Cloudiness level.
     * @param cloudsOpacity Cloud opacity level.
     * @param cloudsDayColor Color for clouds during day.
     * @param cloudsNightColor Color for clouds during night.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteDayNightSky(sunEntity: LightEntity, enableGround: boolean, groundColor: Color,
        groundHeight: number, dayHorizonColor: Color, daySkyColor: Color,
        nightHorizonColor: Color, nightSkyColor: Color, enableSun: boolean, sunDiameter: number,
        sunColor: Color, enableMoon: boolean, moonDiameter: number, moonColor: Color,
        enableStars: boolean, starsBrightness: number, starRotationSpeed: number, enableClouds: boolean,
        cloudsSpeed: Vector2, cloudiness: number, cloudsOpacity: number, cloudsDayColor: Color,
        cloudsNightColor: Color): boolean;

    /**
     * Set the sky to lite-mode day/night procedural with custom textures.
     * @param sunEntity Entity to use for the sun.
     * @param enableGround Whether or not to enable procedural ground.
     * @param groundColor Color for the ground.
     * @param groundHeight Height to place ground at.
     * @param dayHorizonColor Color for horizon during day.
     * @param daySkyColor Color for sky during day.
     * @param nightHorizonColor Color for horizon during night.
     * @param nightSkyColor Color for sky during night.
     * @param enableSun Whether or not to enable procedural sun.
     * @param sunDiameter Diameter of sun.
     * @param sunColor Color of sun.
     * @param enableMoon Whether or not to enable procedural moon.
     * @param moonDiameter Diameter of moon.
     * @param moonColor Color of moon.
     * @param enableStars Whether or not to enable stars.
     * @param starsBrightness Brightness for stars.
     * @param starTextureURI URI to the texture for non-procedural stars.
     * @param starTint Tint for non-procedural stars.
     * @param starScale Scale for non-procedural stars.
     * @param starRotationSpeed Rotation speed for non-procedural stars.
     * @param enableClouds Whether or not to enable procedural clouds.
     * @param cloudsTextureURI URI to texture for clouds.
     * @param cloudsScale Scale for clouds.
     * @param cloudsSpeed Speed for clouds.
     * @param cloudiness Cloudiness level.
     * @param cloudsOpacity Cloud opacity level.
     * @param cloudsDayColor Color for clouds during day.
     * @param cloudsNightColor Color for clouds during night.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteDayNightSky(sunEntity: LightEntity, enableGround: boolean, groundColor: Color,
        groundHeight: number, dayHorizonColor: Color, daySkyColor: Color,
        nightHorizonColor: Color, nightSkyColor: Color, enableSun: boolean, sunDiameter: number,
        sunColor: Color, enableMoon: boolean, moonDiameter: number, moonColor: Color,
        enableStars: boolean, starsBrightness: number, starTextureURI: string, starTint: Color, starScale: number,
        starRotationSpeed: number, enableClouds: boolean, cloudsTextureURI: string, cloudsScale: Vector2,
        cloudsSpeed: Vector2, cloudiness: number, cloudsOpacity: number, cloudsDayColor: Color,
        cloudsNightColor: Color): boolean;

    /**
     * Set the sky to lite-mode day/night procedural with full settings.
     * @param sunEntity Entity to use for the sun.
     * @param enableGround Whether or not to enable procedural ground.
     * @param groundColor Color for the ground.
     * @param groundHeight Height to place ground at.
     * @param groundFadeAmount Factor for fade between ground and horizon.
     * @param horizonSkyBlend Blending factor between horizon and sky.
     * @param dayHorizonColor Color for horizon during day.
     * @param daySkyColor Color for sky during day.
     * @param nightHorizonColor Color for horizon during night.
     * @param nightSkyColor Color for sky during night.
     * @param horizonSaturationAmount Saturation amount for horizon.
     * @param horizonSaturationFalloff Saturation falloff for horizon.
     * @param enableSun Whether or not to enable procedural sun.
     * @param sunDiameter Diameter of sun.
     * @param sunHorizonColor Color of sun at horizon.
     * @param sunZenithColor Color of sun at zenith.
     * @param enableSunSkyLighting Whether or not to enable lighting of sky from sun.
     * @param skyLightingFalloffAmount Falloff amount for sky lighting.
     * @param skyLightingFalloffIntensity Falloff intensity for sky lighting.
     * @param sunsetIntensity Intensity of sunset.
     * @param sunsetRadialFalloff Radial falloff of sunset.
     * @param sunsetHorizontalFalloff Horizontal falloff of sunset.
     * @param sunsetVerticalFalloff Vertical falloff of sunset.
     * @param enableMoon Whether or not to enable procedural moon.
     * @param moonDiameter Diameter of moon.
     * @param moonColor Color of moon.
     * @param moonFalloffAmount Falloff amount for moonlight.
     * @param enableStars Whether or not to enable stars.
     * @param starsBrightness Brightness for stars.
     * @param starsDaytimeBrightness Daytime brightness for stars.
     * @param starsHorizonFalloff Falloff for stars at horizon.
     * @param starsSaturation Saturation for stars.
     * @param enableProceduralStars Whether or not to enable procedural stars.
     * @param proceduralStarsSharpness Sharpness for procedural stars.
     * @param proceduralStarsAmount Amount of procedural stars.
     * @param enableStarsTexture Whether or not to enable star texture (overlaid on top of procedural stars).
     * @param starTextureURI URI to the texture for non-procedural stars.
     * @param starTint Tint for non-procedural stars.
     * @param starScale Scale for non-procedural stars.
     * @param starRotationSpeed Rotation speed for non-procedural stars.
     * @param enableClouds Whether or not to enable procedural clouds.
     * @param cloudsTextureURI URI to texture for clouds.
     * @param cloudsScale Scale for clouds.
     * @param cloudsSpeed Speed for clouds.
     * @param cloudiness Cloudiness level.
     * @param cloudsOpacity Cloud opacity level.
     * @param cloudsSharpness Cloud sharpness level.
     * @param cloudsShadingIntensity Intensity of cloud shading.
     * @param cloudsZenithFalloff Falloff for clouds at zenith.
     * @param cloudsIterations Number of iterations for procedural clouds.
     * @param cloudsGain Gain for procedural clouds.
     * @param cloudsLacunarity Lacunarity for procedural clouds.
     * @param cloudsDayColor Color for clouds during day.
     * @param cloudsNightColor Color for clouds during night.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteDayNightSky(sunEntity: LightEntity, enableGround: boolean, groundColor: Color,
        groundHeight: number, groundFadeAmount: number, horizonSkyBlend: number, dayHorizonColor: Color,
        daySkyColor: Color, nightHorizonColor: Color, nightSkyColor: Color,
        horizonSaturationAmount: number, horizonSaturationFalloff: number, enableSun: boolean, sunDiameter: number,
        sunHorizonColor: Color, sunZenithColor: Color, enableSunSkyLighting: boolean,
        skyLightingFalloffAmount: number, skyLightingFalloffIntensity: number, sunsetIntensity: number,
        sunsetRadialFalloff: number, sunsetHorizontalFalloff: number, sunsetVerticalFalloff: number, enableMoon: boolean,
        moonDiameter: number, moonColor: Color, moonFalloffAmount: number, enableStars: boolean, starsBrightness: number,
        starsDaytimeBrightness: number, starsHorizonFalloff: number, starsSaturation: number, enableProceduralStars: boolean,
        proceduralStarsSharpness: number, proceduralStarsAmount: number, enableStarsTexture: boolean, starTextureURI: string,
        starTint: Color, starScale: number, starRotationSpeed: number, enableClouds: boolean, cloudsTextureURI: string,
        cloudsScale: Vector2, cloudsSpeed: Vector2, cloudiness: number, cloudsOpacity: number, cloudsSharpness: number,
        cloudsShadingIntensity: number, cloudsZenithFalloff: number, cloudsIterations: number, cloudsGain: number, cloudsLacunarity: number,
        cloudsDayColor: Color, cloudsNightColor: Color): boolean;

    /**
     * Set the sky to lite-mode constant color procedural with default settings.
     * @param sunEntity Entity to use for the sun.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteConstantColorSky(sunEntity: LightEntity): boolean;

    /**
     * Set the sky to lite-mode constant color procedural with basic settings.
     * @param sunEntity Entity to use for the sun.
     * @param enableGround Whether or not to enable procedural ground.
     * @param groundColor Color for the ground.
     * @param groundHeight Height to place ground at.
     * @param horizonColor Color for horizon.
     * @param skyColor Color for sky.
     * @param enableSun Whether or not to enable procedural sun.
     * @param sunDiameter Diameter of sun.
     * @param sunColor Color of sun.
     * @param enableMoon Whether or not to enable procedural moon.
     * @param moonDiameter Diameter of moon.
     * @param moonColor Color of moon.
     * @param enableStars Whether or not to enable stars.
     * @param starsBrightness Brightness for stars.
     * @param starRotationSpeed Rotation speed for non-procedural stars.
     * @param enableClouds Whether or not to enable procedural clouds.
     * @param cloudsSpeed Speed for clouds.
     * @param cloudiness Cloudiness level.
     * @param cloudsOpacity Cloud opacity level.
     * @param cloudsColor Color for clouds.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteConstantColorSky(sunEntity: LightEntity, enableGround: boolean, groundColor: Color,
        groundHeight: number, horizonColor: Color, skyColor: Color, enableSun: boolean, sunDiameter: number,
        sunColor: Color, enableMoon: boolean, moonDiameter: number, moonColor: Color, enableStars: boolean,
        starsBrightness: number, starRotationSpeed: number, enableClouds: boolean, cloudsSpeed: Vector2, cloudiness: number,
        cloudsOpacity: number, cloudsColor: Color): boolean;

    /**
     * Set the sky to lite-mode constant color procedural with custom textures.
     * @param sunEntity Entity to use for the sun.
     * @param enableGround Whether or not to enable procedural ground.
     * @param groundColor Color for the ground.
     * @param groundHeight Height to place ground at.
     * @param horizonColor Color for horizon.
     * @param skyColor Color for sky.
     * @param enableSun Whether or not to enable procedural sun.
     * @param sunDiameter Diameter of sun.
     * @param sunColor Color of sun.
     * @param enableMoon Whether or not to enable procedural moon.
     * @param moonDiameter Diameter of moon.
     * @param moonColor Color of moon.
     * @param enableStars Whether or not to enable stars.
     * @param starsBrightness Brightness for stars.
     * @param starTextureURI URI to the texture for non-procedural stars.
     * @param starTint Tint for non-procedural stars.
     * @param starScale Scale for non-procedural stars.
     * @param starRotationSpeed Rotation speed for non-procedural stars.
     * @param enableClouds Whether or not to enable procedural clouds.
     * @param cloudsTextureURI URI to texture for clouds.
     * @param cloudsScale Scale for clouds.
     * @param cloudsSpeed Speed for clouds.
     * @param cloudiness Cloudiness level.
     * @param cloudsOpacity Cloud opacity level.
     * @param cloudsColor Color for clouds.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteConstantColorSky(sunEntity: LightEntity, enableGround: boolean, groundColor: Color,
        groundHeight: number, horizonColor: Color, skyColor: Color, enableSun: boolean, sunDiameter: number,
        sunColor: Color, enableMoon: boolean, moonDiameter: number, moonColor: Color,
        enableStars: boolean, starsBrightness: number, starTextureURI: string, starTint: Color, starScale: number,
        starRotationSpeed: number, enableClouds: boolean, cloudsTextureURI: string, cloudsScale: Vector2,
        cloudsSpeed: Vector2, cloudiness: number, cloudsOpacity: number, cloudsColor: Color): boolean;

    /**
     * Set the sky to lite-mode constant color procedural with full settings.
     * @param sunEntity Entity to use for the sun.
     * @param enableGround Whether or not to enable procedural ground.
     * @param groundColor Color for the ground.
     * @param groundHeight Height to place ground at.
     * @param groundFadeAmount Factor for fade between ground and horizon.
     * @param horizonSkyBlend Blending factor between horizon and sky.
     * @param horizonColor Color for horizon.
     * @param skyColor Color for sky.
     * @param horizonSaturationAmount Saturation amount for horizon.
     * @param horizonSaturationFalloff Saturation falloff for horizon.
     * @param enableSun Whether or not to enable procedural sun.
     * @param sunDiameter Diameter of sun.
     * @param sunHorizonColor Color of sun at horizon.
     * @param sunZenithColor Color of sun at zenith.
     * @param enableSunSkyLighting Whether or not to enable lighting of sky from sun.
     * @param skyLightingFalloffAmount Falloff amount for sky lighting.
     * @param skyLightingFalloffIntensity Falloff intensity for sky lighting.
     * @param sunsetIntensity Intensity of sunset.
     * @param sunsetRadialFalloff Radial falloff of sunset.
     * @param sunsetHorizontalFalloff Horizontal falloff of sunset.
     * @param sunsetVerticalFalloff Vertical falloff of sunset.
     * @param enableMoon Whether or not to enable procedural moon.
     * @param moonDiameter Diameter of moon.
     * @param moonColor Color of moon.
     * @param moonFalloffAmount Falloff amount for moonlight.
     * @param enableStars Whether or not to enable stars.
     * @param starsBrightness Brightness for stars.
     * @param starsDaytimeBrightness Daytime brightness for stars.
     * @param starsHorizonFalloff Falloff for stars at horizon.
     * @param starsSaturation Saturation for stars.
     * @param enableProceduralStars Whether or not to enable procedural stars.
     * @param proceduralStarsSharpness Sharpness for procedural stars.
     * @param proceduralStarsAmount Amount of procedural stars.
     * @param enableStarsTexture Whether or not to enable star texture (overlaid on top of procedural stars).
     * @param starTextureURI URI to the texture for non-procedural stars.
     * @param starTint Tint for non-procedural stars.
     * @param starScale Scale for non-procedural stars.
     * @param starRotationSpeed Rotation speed for non-procedural stars.
     * @param enableClouds Whether or not to enable procedural clouds.
     * @param cloudsTextureURI URI to texture for clouds.
     * @param cloudsScale Scale for clouds.
     * @param cloudsSpeed Speed for clouds.
     * @param cloudiness Cloudiness level.
     * @param cloudsOpacity Cloud opacity level.
     * @param cloudsSharpness Cloud sharpness level.
     * @param cloudsShadingIntensity Intensity of cloud shading.
     * @param cloudsZenithFalloff Falloff for clouds at zenith.
     * @param cloudsIterations Number of iterations for procedural clouds.
     * @param cloudsGain Gain for procedural clouds.
     * @param cloudsLacunarity Lacunarity for procedural clouds.
     * @param cloudsColor Color for clouds.
     * @returns Whether or not the operation was successful.
     */
    static SetLiteConstantColorSky(sunEntity: LightEntity, enableGround: boolean, groundColor: Color,
        groundHeight: number, groundFadeAmount: number, horizonSkyBlend: number, horizonColor: Color, skyColor: Color,
        horizonSaturationAmount: number, horizonSaturationFalloff: number, enableSun: boolean, sunDiameter: number, sunHorizonColor: Color,
        sunZenithColor: Color, enableSunSkyLighting: boolean, skyLightingFalloffAmount: number, skyLightingFalloffIntensity: number,
        sunsetIntensity: number, sunsetRadialFalloff: number, sunsetHorizontalFalloff: number, sunsetVerticalFalloff: number, enableMoon: boolean,
        moonDiameter: number, moonColor: Color, moonFalloffAmount: number, enableStars: boolean, starsBrightness: number,
        starsDaytimeBrightness: number, starsHorizonFalloff: number, starsSaturation: number, enableProceduralStars: boolean,
        proceduralStarsSharpness: number, proceduralStarsAmount: number, enableStarsTexture: boolean, starTextureURI: string, starTint: Color,
        starScale: number, starRotationSpeed: number, enableClouds: boolean, cloudsTextureURI: string, cloudsScale: Vector2,
        cloudsSpeed: Vector2, cloudiness: number, cloudsOpacity: number, cloudsSharpness: number, cloudsShadingIntensity: number,
        cloudsZenithFalloff: number, cloudsIterations: number, cloudsGain: number, cloudsLacunarity: number, cloudsColor: Color): boolean;

    /**
     * Activate lite-mode fog.
     * @param color Color of the fog.
     * @param density Density of the fog.
     * @returns Whether or not the operation was successful.
     */
    static ActivateLiteFog(color: Color, density: number): boolean;

    /**
     * Disable all fog.
     * @returns Whether or not the operation was successful.
     */
    static DisableFog(): boolean;
}

// ============================================================================
// Data
// ============================================================================

/**
 * Class for asynchronous JSON operations.
 */
declare class AsyncJSON {
    /**
     * Parse JSON asynchronously.
     * @param rawText Raw JSON text.
     * @param onComplete Callback function name.
     * @param context Optional context parameter.
     */
    static Parse(rawText: string, onComplete: string, context?: any): void;

    /**
     * Stringify JSON asynchronously.
     * @param jsonObject JSON object to stringify.
     * @param onComplete Callback function name.
     * @param context Optional context parameter.
     */
    static Stringify(jsonObject: any, onComplete: string, context?: any): void;
}

// ============================================================================
// VOS Synchronization (available when USE_WEBINTERFACE is defined)
// ============================================================================

/**
 * VOS Synchronization transport enum.
 */
declare enum VSSTransport {
    TCP = 0,
    WebSocket = 1
}

/**
 * Class for VOS Synchronization (available when USE_WEBINTERFACE is defined).
 */
declare class VOSSynchronization {
    /**
     * Create a VOS Synchronization Session.
     * @param host Host of the connection to create the session on.
     * @param port Port of the connection to create the session on.
     * @param tls Whether to use TLS.
     * @param id RFC 4122-encoded UUID identifier for the session.
     * @param tag Tag for the session.
     * @param transport Transport to use (default: TCP).
     * @returns Whether or not the operation was successful.
     */
    static CreateSession(host: string, port: number, tls: boolean, id: string, tag: string, transport?: VSSTransport): boolean;

    /**
     * Create a VOS Synchronization Session with world offset.
     * @param host Host of the connection to create the session on.
     * @param port Port of the connection to create the session on.
     * @param tls Whether to use TLS.
     * @param id RFC 4122-encoded UUID identifier for the session.
     * @param tag Tag for the session.
     * @param worldOffset Offset for this synchronized client in the world.
     * @param transport Transport to use (default: TCP).
     * @param clientID Optional client ID.
     * @param clientToken Optional client token.
     * @returns Whether or not the operation was successful.
     */
    static CreateSession(host: string, port: number, tls: boolean, id: string, tag: string, worldOffset: Vector3, transport?: VSSTransport, clientID?: string, clientToken?: string): boolean;

    /**
     * Destroy a VOS Synchronization Session.
     * @param id ID of the session to destroy.
     * @returns Whether or not the operation was successful.
     */
    static DestroySession(id: string): boolean;

    /**
     * Join a VOS Synchronization Session.
     * @param host Host of the connection of the session to join.
     * @param port Port of the connection of the session to join.
     * @param tls Whether to use TLS.
     * @param id RFC 4122-encoded UUID identifier of the session.
     * @param tag Tag of the client.
     * @param callback Optional callback function name to invoke when joined.
     * @param transport Transport to use (default: TCP).
     * @param clientID Optional client ID.
     * @param clientToken Optional client token.
     * @returns Client ID of the joined session, or null if failed.
     */
    static JoinSession(host: string, port: number, tls: boolean, id: string, tag: string, callback?: string, transport?: VSSTransport, clientID?: string, clientToken?: string): string | null;

    /**
     * Join a VOS Synchronization Session with world offset.
     * @param host Host of the connection of the session to join.
     * @param port Port of the connection of the session to join.
     * @param tls Whether to use TLS.
     * @param id RFC 4122-encoded UUID identifier of the session.
     * @param tag Tag of the client.
     * @param worldOffset Offset for this synchronized client in the world.
     * @param callback Optional callback function name to invoke when joined.
     * @param transport Transport to use (default: TCP).
     * @param clientID Optional client ID.
     * @param clientToken Optional client token.
     * @returns Client ID of the joined session, or null if failed.
     */
    static JoinSession(host: string, port: number, tls: boolean, id: string, tag: string, worldOffset: Vector3, callback?: string, transport?: VSSTransport, clientID?: string, clientToken?: string): string | null;

    /**
     * Exit a VOS Synchronization Session.
     * @param id ID of the session to exit.
     * @returns Whether or not the operation was successful.
     */
    static ExitSession(id: string): boolean;

    /**
     * Check if a session is established.
     * @param sessionID ID of session to check.
     * @returns Whether or not the session is established.
     */
    static IsSessionEstablished(sessionID: string): boolean;

    /**
     * Start synchronizing an entity.
     * @param sessionID Session ID to synchronize the entity on.
     * @param entityID ID of the entity to synchronize.
     * @param deleteWithClient Whether or not to delete the entity upon disconnection of the client (default: false).
     * @param filePath Optional path to a file to load with the entity.
     * @param resources Optional resources to include with the entity.
     * @returns Whether or not the operation was successful.
     */
    static StartSynchronizingEntity(sessionID: string, entityID: string, deleteWithClient?: boolean, filePath?: string, resources?: string[]): boolean;

    /**
     * Stop synchronizing an entity.
     * @param sessionID Session ID to stop synchronizing the entity on.
     * @param entityID ID of the entity to stop synchronizing.
     * @returns Whether or not the operation was successful.
     */
    static StopSynchronizingEntity(sessionID: string, entityID: string): boolean;

    /**
     * Send a message.
     * @param sessionID Session ID to send the message on.
     * @param topic Topic to send the message on.
     * @param message Message to send.
     * @returns Whether or not the operation was successful.
     */
    static SendMessage(sessionID: string, topic: string, message: string): boolean;

    /**
     * Register a message callback.
     * @param sessionID Session ID to register the message callback on.
     * @param callback Function name to invoke when a message is received. Function receives (topic: string, senderID: string, message: string).
     * @returns Whether or not the operation was successful.
     */
    static RegisterMessageCallback(sessionID: string, callback: string): boolean;

    /**
     * Get the tag for a user.
     * @param sessionID Session ID of the session containing the user.
     * @param userID ID of the user to get the tag of.
     * @returns Tag of the user, or null if not found.
     */
    static GetUserTag(sessionID: string, userID: string): string | null;
}

// ============================================================================
// World Browser Utilities
// ============================================================================

/**
 * Class for camera manipulation.
 */
declare class Camera {
    /**
     * Attach camera to an entity.
     * @param entityToAttachTo Entity to attach camera to, or null to make root.
     * @returns Whether or not the operation was successful.
     */
    static AttachToEntity(entityToAttachTo: BaseEntity | null): boolean;

    /**
     * Add a camera follower.
     * @param entity Entity to follow.
     * @returns Whether or not the operation was successful.
     */
    static AddCameraFollower(entity: BaseEntity): boolean;

    /**
     * Remove a camera follower.
     * @param entity Entity to stop following.
     * @returns Whether or not the operation was successful.
     */
    static RemoveCameraFollower(entity: BaseEntity): boolean;

    /**
     * Set position of the camera.
     * @param position Position to apply to camera.
     * @param local Whether or not the position is local.
     * @returns Whether or not the operation was successful.
     */
    static SetPosition(position: Vector3, local: boolean): boolean;

    /**
     * Get the position of the camera.
     * @param local Whether or not the position is local.
     * @returns The position of the camera.
     */
    static GetPosition(local: boolean): Vector3;

    /**
     * Set the rotation of the camera.
     * @param rotation Rotation to apply to camera.
     * @param local Whether or not the rotation is local.
     * @returns Whether or not the operation was successful.
     */
    static SetRotation(rotation: Quaternion, local: boolean): boolean;

    /**
     * Get the rotation of the camera.
     * @param local Whether or not the rotation is local.
     * @returns The rotation of the camera.
     */
    static GetRotation(local: boolean): Quaternion;
}

/**
 * Class for context management.
 */
declare class Context {
    /**
     * Set a context.
     * @param contextName Name of the context.
     * @param context Context.
     */
    static DefineContext(contextName: string, context: any): void;

    /**
     * Get a context.
     * @param contextName Name of the context.
     * @returns Context.
     */
    static GetContext(contextName: string): any;
}

/**
 * Class for date and time operations.
 */
declare class Date {
    /** Get a Date for the current millisecond. */
    static readonly now: Date;

    /** Year. */
    readonly year: number;
    /** Month. */
    readonly month: number;
    /** Day. */
    readonly day: number;
    /** Day of week (0=Sunday, 6=Saturday). */
    readonly dayOfWeek: number;
    /** Day of year. */
    readonly dayOfYear: number;
    /** Hour. */
    readonly hour: number;
    /** Minute. */
    readonly minute: number;
    /** Second. */
    readonly second: number;
    /** Millisecond. */
    readonly millisecond: number;

    /**
     * Constructor for a Date.
     * @param year Year.
     * @param month Month.
     * @param day Day.
     */
    constructor(year: number, month: number, day: number);
    /**
     * Constructor for a Date.
     * @param year Year.
     * @param month Month.
     * @param day Day.
     * @param hours Hours.
     */
    constructor(year: number, month: number, day: number, hours: number);
    /**
     * Constructor for a Date.
     * @param year Year.
     * @param month Month.
     * @param day Day.
     * @param hours Hours.
     * @param minutes Minutes.
     */
    constructor(year: number, month: number, day: number, hours: number, minutes: number);
    /**
     * Constructor for a Date.
     * @param year Year.
     * @param month Month.
     * @param day Day.
     * @param hours Hours.
     * @param minutes Minutes.
     * @param seconds Seconds.
     */
    constructor(year: number, month: number, day: number, hours: number, minutes: number, seconds: number);
    /**
     * Constructor for a Date.
     * @param year Year.
     * @param month Month.
     * @param day Day.
     * @param hours Hours.
     * @param minutes Minutes.
     * @param seconds Seconds.
     * @param milliseconds Milliseconds.
     */
    constructor(year: number, month: number, day: number, hours: number, minutes: number, seconds: number, milliseconds: number);
    /**
     * Constructor for a Date.
     * @param dateString Date string.
     */
    constructor(dateString: string);

    /**
     * Get a string representation of the complete date and time.
     * @returns A string representation of the complete date and time.
     */
    ToString(): string;

    /**
     * Get a string representation of the date.
     * @returns A string representation of the date.
     */
    ToDateString(): string;

    /**
     * Get a string representation of the time.
     * @returns A string representation of the time.
     */
    ToTimeString(): string;

    /**
     * Get a string representation of the complete UTC date and time.
     * @returns A string representation of the complete UTC date and time.
     */
    ToUTCString(): string;
}

/**
 * Class for local storage operations.
 */
declare class LocalStorage {
    /**
     * Set an item in local storage.
     * @param key Storage key.
     * @param value Value to store.
     */
    static SetItem(key: string, value: string): void;

    /**
     * Get an item from local storage.
     * @param key Storage key.
     * @returns The stored value, or null.
     */
    static GetItem(key: string): string | null;

    /**
     * Remove an item from local storage.
     * @param key Storage key.
     */
    static RemoveItem(key: string): void;
}

/**
 * Logging message type enum.
 */
declare enum LoggingType {
    Default = 0,
    Debug = 1,
    Warning = 2,
    Error = 3
}

/**
 * Class for logging operations.
 */
declare class Logging {
    /**
     * Log a message.
     * @param message Message to log.
     * @param type Type of the message.
     */
    static Log(message: string, type?: LoggingType): void;

    /**
     * Log a debug message.
     * @param message Debug message to log.
     */
    static LogDebug(message: string): void;

    /**
     * Log a warning message.
     * @param message Warning message to log.
     */
    static LogWarning(message: string): void;

    /**
     * Log an error message.
     * @param message Error message to log.
     */
    static LogError(message: string): void;
}

/**
 * Class for scripting operations.
 */
declare class Scripting {
    /**
     * Run a script.
     * @param scriptToRun Script to run.
     */
    static RunScript(scriptToRun: string): void;
}

/**
 * Class for time operations.
 */
declare class Time {
    /**
     * Set interval at which to run a function.
     * @param functionName Function to run.
     * @param interval Interval at which to run the function.
     * @returns ID of the registered function, or null.
     */
    static SetInterval(functionName: string, interval: number): UUID | null;

    /**
     * Call a function asynchronously.
     * @param functionName Function to call.
     * @returns Whether or not the operation was successful.
     */
    static CallAsynchronously(functionName: string): boolean;

    /**
     * Stop running a registered function.
     * @param id ID of the registered function to stop running.
     * @returns Whether or not the operation was successful.
     */
    static StopInterval(id: string | null): boolean;

    /**
     * Set timeout after which to run logic.
     * @param logic Logic to run.
     * @param timeout Timeout after which to run the specified logic.
     * @returns Whether or not the operation was successful.
     */
    static SetTimeout(logic: string, timeout: number): boolean;
}

/**
 * Class for world operations.
 */
declare class World {
    /**
     * Get a URL Query Parameter.
     * @param key Key of the Query Parameter.
     * @returns The value of the Query Parameter, or null.
     */
    static GetQueryParam(key: string): string | null;

    /**
     * Get the current World Load State.
     * @returns One of: unloaded, loadingworld, loadedworld, webpage, error.
     */
    static GetWorldLoadState(): "unloaded" | "loadingworld" | "loadedworld" | "webpage" | "error";

    /**
     * Load a World from a URL.
     * @param url The URL of the World to load.
     */
    static LoadWorld(url: string): void;

    /**
     * Load a Web Page from a URL.
     * @param url The URL of the Web Page to load.
     */
    static LoadWebPage(url: string): void;
}

/**
 * Class for world storage operations.
 */
declare class WorldStorage {
    /**
     * Set an item in world storage.
     * @param key Storage key.
     * @param value Value to store.
     */
    static SetItem(key: string, value: string): void;

    /**
     * Get an item from world storage.
     * @param key Storage key.
     * @returns The stored value, or null.
     */
    static GetItem(key: string): string | null;
}