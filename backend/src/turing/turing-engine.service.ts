import { BadRequestException, Injectable } from '@nestjs/common';
import { AST, ASTType } from '../interfaces/ast.interface.js';
import { CompilationMetadata, AudioEvent, TapeHistory, AudioMatrixDTO }
from '../interfaces/audio-matrix.interface.js';

import { ExecutionContext } from './execution-context.model.js'
import { TapeMatrix } from './tape-matrix.model.js';

@Injectable()
export class TuringService {
    private headAudioTicks: Map<number, number> = new Map();

    private resetTick() {
        this.headAudioTicks.clear();
    }

    execute(ast: AST, incomingMetadata?: CompilationMetadata): AudioMatrixDTO {
        this.resetTick();
        const tape = new TapeMatrix();
        const context = new ExecutionContext();
        const audioEvents: AudioEvent[] = [];
        const tapeHistory: TapeHistory[] = [];
        const metadata: CompilationMetadata = {
            bpm: 120,
            ...incomingMetadata,
        };

        // Recorrido recursivo del AST
        this.evaluateNode(ast, tape, context, audioEvents, tapeHistory, metadata);

        audioEvents.sort((a, b) => 
            a.time - b.time || 
            String(a.track).localeCompare(String(b.track), undefined, { numeric: true })
        );

        return {
            success: true,
            metadata: metadata,
            audioMatrix: audioEvents,
            tapeHistory: tapeHistory
        };
    }

    private evaluateNode(
        node: AST, 
        tape: TapeMatrix, 
        context: ExecutionContext, 
        audioEvents: AudioEvent[], 
        tapeHistory: TapeHistory[], 
        metadata: CompilationMetadata
    ): any {
        if (!node) return;

        switch (node.type) {
            case ASTType.PROGRAM:
            // Recorre cada instrucción dentro del cuerpo del programa
                if (node.body) {
                    let pc = 0;
                    let totalExecutions = 0;
                    const MAX_ITERATIONS = 1000; // Evita que un JUMP infinito cuelgue el servidor

                    while (pc < node.body.length) {
                        if (++totalExecutions > MAX_ITERATIONS) {
                        throw new BadRequestException(
                            'Se excedió el límite máximo de ciclos permitidos (1000).'
                        );
                        }

                        const currentStmt = node.body[pc];
                        const jumpTargetIndex = this.evaluateNode(
                        currentStmt, tape, context, audioEvents, tapeHistory, metadata
                        );

                        // Si el JUMP define un salto de línea/instrucción, actualiza el pc; si no, avanza 1
                        if (currentStmt.name?.toUpperCase() === 'JUMP' && typeof jumpTargetIndex === 'number') {
                        pc = jumpTargetIndex;
                        } else {
                        pc++;
                        }
                    }
                    }
                break;

            case ASTType.INSTRUCTION:
                return this.handleInstruction(node, tape, context, audioEvents, tapeHistory, metadata);

            case ASTType.LITERAL:
                return node.value;

            case ASTType.IDENTIFIER:
                if (!node.name) throw new BadRequestException('Identificador sin nombre.');
                // Si el nodo trae 'value', es una asignación (ej: x = 10)[cite: 4]
                if (node.value !== undefined) {
                    context.setVariable(node.name, Number(node.value));
                    return node.value;
                }
                return context.getVariable(node.name);

            case ASTType.CONDITION:
                return this.evaluateCondition(node, tape, context, audioEvents, tapeHistory, metadata);

            case ASTType.FUNCTION:
                if (!node.name || !node.body) {
                    throw new BadRequestException('Definición de función inválida.');
                }
                context.registerFunction(node.name, node);
                break;
            
            case ASTType.CALL: {
                if (!node.name) {
                    throw new BadRequestException('Llamada a función sin nombre.');
                }
                const fnNode = context.getFunction(node.name);
                if (!fnNode) {
                    throw new BadRequestException(`La función '${node.name}' no está definida.`);
                }

                // 1. Vincular cada parámetro de la definición con el valor pasado en la llamada
                const definedParams = fnNode.arguments || [];
                const passedArgs = node.arguments || [];

                for (let i = 0; i < definedParams.length; i++) {
                    const paramName = definedParams[i].name;
                    if (paramName) {
                    const argValue = passedArgs[i]
                        ? this.evaluateNode(passedArgs[i], tape, context, audioEvents, tapeHistory, metadata)
                        : 0;
                    context.setVariable(paramName, Number(argValue));
                    }
                }

                // 2. Ahora 'value' ya existe en context; ejecutar el cuerpo de la función
                if (fnNode.body) {
                    for (const stmt of fnNode.body) {
                    this.evaluateNode(stmt, tape, context, audioEvents, tapeHistory, metadata);
                    }
                }
                break;
                }

            default:
            break;
        }
    }

    private handleInstruction(
        node: AST, 
        tape: TapeMatrix, 
        context: ExecutionContext, 
        audioEvents: AudioEvent[], 
        tapeHistory: TapeHistory[],
        metadata: CompilationMetadata,
    ) {
        const instructionName = node.name;
        const args = node.arguments || [];

        switch (instructionName) {
            case 'READ': {
                // Devuelve el valor entero de la celda bajo el cabezal (0 si está vacía)
                return Number(tape.readCurrentCell() ?? 0);
            }

            case 'WRITE':
            // Evaluar el argumento y escribir en la celda actual de la cinta
            const val = this.evaluateNode(args[0], tape, context, audioEvents, tapeHistory, {bpm: metadata.bpm});
            tape.writeCurrentCell(val);
            break;

            case 'SPAWN': {
                const headId = Number(this.evaluateNode(args[0], tape, context, audioEvents, tapeHistory, metadata));
                tape.spawnHead(headId);
                const maxCurrentTick = this.headAudioTicks.size > 0
                    ? Math.max(...this.headAudioTicks.values())
                    : 0;

                // El nuevo cabezal arranca sincronizado en el punto actual de la línea de tiempo
                this.headAudioTicks.set(headId, maxCurrentTick);
                break;
            }

            case 'KILL': {
                const headId = Number(this.evaluateNode(args[0], tape, context, audioEvents, tapeHistory, metadata));
                tape.killHead(headId);
                break;
            }

            case 'EMIT': {
                // 1. Evaluar los 3 argumentos: EMIT(valor, ticks, headId)
                const rawValue = Number(this.evaluateNode(args[0], tape, context, audioEvents, tapeHistory, metadata));
                const durationTicks = Number(this.evaluateNode(args[1], tape, context, audioEvents, tapeHistory, metadata));
                const headId = Number(this.evaluateNode(args[2], tape, context, audioEvents, tapeHistory, metadata));

                // 2. Validar que el cabezal de emisión fue inicializado con SPAWN(headId)
                tape.validateEmitHead(headId);
                const note = this.mapValueToNote(rawValue);

                // 3. Obtener el reloj independiente de ESTE head (si es su primera nota, empieza en 0)
                const currentHeadTick = this.headAudioTicks.get(headId) ?? 0;

                if (note !== null) {
                    // 4. Calcular tiempos musicales según metadata.bpm
                    const secondsPerTick = 60 / (metadata.bpm * 8); // 1 tick = 1 semicorchea (16n)
                    const startTimeSec = Number((currentHeadTick * secondsPerTick).toFixed(3));
                    const durationSec = `${(durationTicks * secondsPerTick).toFixed(3)}s`;

                    // 5. Registrar el evento en la matriz de audio usando el reloj de este head
                    audioEvents.push({
                        step: currentHeadTick,
                        track: headId,
                        note: note,
                        duration: durationSec,
                        time: startTimeSec,
                        position: [...tape.getHeadPosition()] as [number, number],
                    });
                }

                // 6. Avanzar ÚNICAMENTE el reloj de este headId
                this.headAudioTicks.set(headId, currentHeadTick + durationTicks);

                // Avanzar el paso visual de la cinta
                tape.incrementStep();
                break;
                }

            case 'JUMP': {
                // 1. Evaluar la condición (ASTType.CONDITION)
                const conditionMet = Boolean(
                    this.evaluateNode(args[0], tape, context, audioEvents, tapeHistory, metadata)
                );

                if (conditionMet) {
                    // 2. Evaluar fila (ej. '#B') y columna (ej. 4 o una expresión/variable)
                    const targetRow = String(
                    this.evaluateNode(args[1], tape, context, audioEvents, tapeHistory, metadata)
                    );
                    const targetCol = Number(
                    this.evaluateNode(args[2], tape, context, audioEvents, tapeHistory, metadata)
                    );

                    // 3. Mover el cabezal en la matriz de Turing (valida límites y lanza SEMANTIC_ERR_*)
                    tape.jumpHeadTo(targetRow, targetCol);
                }
                break;
                }
            }

            const cmd = instructionName?.trim();

            switch (cmd) {
            case '<<':
            case 'SHIFT_LEFT':
                tape.moveHead('<<');
                tape.incrementStep();
                break;

            case '>>':
            case 'SHIFT_RIGHT':
                tape.moveHead('>>');
                tape.incrementStep();
                break;

            case '^':
            case 'UP':
                tape.moveHead('^');
                tape.incrementStep();
                break;

            case 'v':
            case 'V':
            case 'DOWN':
                tape.moveHead('v');
                tape.incrementStep();
                break;

            default:
            // Manejar movimientos de cabezal (<<, >>, ^, v) o errores semánticos
            break;
        }

        // Guardar una "fotografía" (snapshot) del estado de la cinta en este paso exacto
        tapeHistory.push({
            step: tape.getCurrentStep(),
            tapeIndex: tape.getActiveCells(),
            headPosition: [...tape.getHeadPosition()],
            symbols: [...tape.getCurrentTapeSymbols()],
        });
    }

    private evaluateCondition(
        node: AST,
        tape: TapeMatrix,
        context: ExecutionContext,
        audioEvents: AudioEvent[],
        tapeHistory: TapeHistory[],
        metadata: CompilationMetadata
    ): boolean {
        if (!node.left || !node.right || !node.operator) return false;

        const leftVal = this.evaluateNode(node.left, tape, context, audioEvents, tapeHistory, metadata);
        const rightVal = typeof node.right === 'object' 
            ? this.evaluateNode(node.right, tape, context, audioEvents, tapeHistory, metadata) 
            : node.right;

        switch (node.operator) {
            case '==': return leftVal == rightVal;
            case '!=': return leftVal != rightVal;
            case '<':  return leftVal < rightVal;
            case '>':  return leftVal > rightVal;
            case '<=': return leftVal <= rightVal;
            case '>=': return leftVal >= rightVal;
            default:   return false;
        }
    }

    private mapValueToNote(value: number): string | null {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

        // 0 representa silencio (no se dispara nota)
        if (safeValue === 0) {
            return null;
        }

        // Mapeo MIDI estándar directo (1 a 127; ej: 60 = C4, 69 = A4)
        const midiNote = Math.min(safeValue, 127);
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = notes[midiNote % 12];

        return `${noteName}${octave}`;
    }
}