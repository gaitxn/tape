# 🤝 Guía de Colaboración y Reglas del Equipo — TAPE

Para mantener un flujo de trabajo ordenado, asegurar la calidad del código y evitar conflictos en el repositorio, todos los integrantes debemos seguir estas normas:

## 1. Estrategia de Ramas (Branching)
* **Prohibido subir código directamente a `main`.**
* Todo desarrollo se realiza en ramas independientes basadas en las tareas del cronograma:
  * Formato: `feature/sprintX-nombre-corto`
  * Ejemplo: `feature/sprint1-lexer-and-ui`

## 2. Convención de Commits Semánticos
Escribe mensajes de commit claros, cortos y descriptivos utilizando prefijos estándar:
* `feat(...)`: Añadir una nueva funcionalidad (ej. `feat(backend): implementa el lexer del DSL`).
* `fix(...)`: Corrección de un error o *bug* (ej. `fix(frontend): corrige desajuste en el reproductor de audio`).
* `test(...)`: Creación o modificación de pruebas (ej. `test(backend): añade pruebas unitarias en Jest`).
* `docs(...)`: Cambios en la documentación o README.

## 3. Pull Requests y Code Review (Revisión Obligatoria)
* Ningún código se fusiona a `main` sin un **Pull Request (PR)** previo.
* Todo PR requiere **al menos 1 aprobación** de un compañero antes de integrarse.
* Utiliza la sección de comentarios del PR para debatir dudas de arquitectura o lógica.

## 4. Política de Pruebas (Calidad de Software)
Antes de abrir un Pull Request, es obligatorio verificar que las pruebas existentes sigan pasando en tu entorno local:
* **Para el Backend (NestJS):**
  ```bash
  cd backend
  npm test          # Pruebas unitarias
  npm run test:e2e  # Pruebas de integración
  ```
* **Para el Frontend (Angular):**
  ```bash
  cd frontend
  ng test --watch=false  # Pruebas unitarias/componentes
  ```
