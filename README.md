# TAPE — Turing Audio Processing Engine

> **Plataforma Web de Composición y Síntesis Sonora basada en Máquinas de Turing Multipista.**

---

## Descripción del Proyecto

**TAPE** (*Turing Audio Processing Engine*) es un entorno interactivo web que permite componer patrones musicales y audios experimentales mediante un **Lenguaje de Dominio Específico (DSL)**. El núcleo procesa la lógica de estados y cintas utilizando un motor de **Máquina de Turing Multipista**, compilando las transiciones en matrices estructuradas de audio que se reproducen y visualizan dinámicamente en el navegador.

Este proyecto integra de forma colaborativa los requerimientos de tres asignaturas clave:
* **Backend (NestJS):** Lexer, Parser, motor de ejecución de Turing y API REST de compilación.
* **Frontend (Angular):** Interfaz gráfica, editor de código con sintaxis y sintetizador en tiempo real (Web Audio API / Tone.js).
* **Aseguramiento de Calidad (Pruebas de Software):** Suite integral de pruebas unitarias (Jest/Jasmine), de integración (Supertest) y de extremo a extremo (E2E con Playwright).

---

## Arquitectura General

```text
  [ Angular Frontend ] ──( Código DSL )──> [ API REST NestJS ]
           ▲                                       │
     (Matriz JSON)                             (Compilador)
           │                                       ▼
  [ Web Audio Engine ] <───( Audio JSON )─── [ Motor Turing ]
```

## Guía de Instalación Local
Para levantar el proyecto en tu entorno de desarrollo local, sigue estos pasos:

* **1. Clonar el repositorio**
```Bash
git clone https://github.com/gaitxn/tape.git
cd tape
```
* **2. Configurar el Backend (NestJS)**
Bash
```Bash
cd backend
npm install
```
* **3. Configurar el Frontend (Angular)**
```Bash
cd ../frontend
npm install
```

## Cómo Ejecutar el Proyecto
Debes mantener dos terminales abiertas simultáneamente para correr el backend y el frontend:

* **Terminal 1 (Backend - NestJS):**
```Bash
cd backend
npm run start:dev
```
(La API REST correrá en http://localhost:3000)

* **Terminal 2 (Frontend - Angular):**
```Bash
cd frontend
ng serve
```
(La aplicación web correrá en http://localhost:4200)

## Equipo de Desarrollo
Proyecto desarrollado por: 
* Daniel Gaitán (@gaitxn)
* Daniel Vásquez (@ST4LK3RDE21)
* Andrés Gutiérrez (@AndresGbq)
* Alejandro Velásquez (@Jhank-1)
