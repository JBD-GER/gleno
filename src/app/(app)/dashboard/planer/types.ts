// File: src/app/(app)/dashboard/planer/types.ts

export type Segment = {
  length: number
  angle:  number
}

export type WallConfig = {
  height:     number   // Gesamthöhe in cm
  pitch:      number   // Neigungswinkel in °
  pitchStart: number   // Höhe in cm, ab der die Neigung beginnt
}

export type Opening = {
  type:      'window' | 'door'
  wallIndex: number       // an welcher Wand
  position:  number       // cm ab Wandanfang
  width:     number       // cm
  height:    number       // cm
  dx?:       number       // X-Offset in m
  dy?:       number       // Y-Offset in m
  dz?:       number       // Z-Offset in m
    rotationX?: number      // rad, Rotation um X-Achse
  rotationY?: number      // Y-Rotation in rad
  relQuat?: [number, number, number, number]
}
