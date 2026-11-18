export interface CompilationMetadata {
  bpm: number;
  scale?: string;
  tracks?: number;
}

export interface AudioEvent {
  step: number;
  track: number | string; // Ej: 'A', 'B', 'C', 'D' o índice numérico
  note: string | number;  // Valor MIDI o nota generada (0-128)
  duration: string | number;
  time: number;
}

export interface TapeHistory {
  step: number;
  tapeIndex: number[][];   // Ficha/Pista activa (ej. 'A')
  headPosition: number[];         // Posición actual del cabezal
  symbols: (string | number)[]; // Estado de las celdas de esa cinta en este paso
}

export interface AudioMatrixDTO {
  success: boolean;
  metadata: CompilationMetadata;
  audioMatrix: AudioEvent[];
  tapeHistory: TapeHistory[];
  
  // Métodos de ayuda opcionales para consultar la estructura
  getEventsByTrack?(trackId: number | string): AudioEvent[];
  getStepState?(step: number): TapeHistory[];
}