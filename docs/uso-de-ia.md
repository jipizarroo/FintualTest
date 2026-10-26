# Uso de IA

Esta aplicación se desarrolló con asistencia de Codex dentro de T3 Code. El usuario definió el alcance, el límite de tiempo y el uso de TanStack, React y shadcn. Los agentes propusieron estructuras, escribieron código y colaboraron en su revisión.

La consigna permite usar LLM y exige compartir las conversaciones. Los archivos de esta carpeta conservan mensajes exportados de las herramientas de la sesión. No son una reconstrucción de una conversación ni una explicación inventada del razonamiento interno.

## Evidencia exportada

- [Conversación principal](llm/conversacion-principal.md): lectura cronológica en Markdown de los mensajes de usuario y asistente.
- [Conversaciones completas en JSONL](conversaciones.jsonl): mensajes del hilo principal, sesiones de subagentes y comunicaciones entre agentes. Cada registro identifica su sesión y fecha.
- [Llamadas de herramientas](llm/llamadas.jsonl): nombre, identificador y entrada de cada llamada registrada. Incluye encargos a subagentes, llamadas de orquestación y comandos que leen skills. Las llamadas hechas desde `exec` conservan el script que las contiene.
- [Referencias a skills](llm/referencias-skills.jsonl): subconjunto de llamadas cuyo texto contiene `SKILL.md`. Una referencia dentro de un encargo no prueba por sí sola que el agente leyó la skill; el registro distingue la referencia de una llamada de lectura.
- [Sesiones de origen](llm/sesiones.json): identificadores, origen disponible y cantidad de mensajes y llamadas por sesión.
- [Manifiesto de exportación](llm/manifest.json): fecha de corte, conteos y hashes SHA-256 de los archivos para verificar su integridad.

La exportación toma los registros locales de Codex correspondientes al proyecto y a su worktree. Conserva los datos observados, sin reconstruir llamadas o conversaciones faltantes. Los resultados de herramientas, instrucciones internas de sistema y desarrollador, razonamiento privado y adjuntos binarios quedan fuera de la exportación. Las capturas de las verificaciones están en [qa](qa).

Las rutas personales se normalizaron a `/home/usuario`, `/workspace/main` y `/workspace/worktree`. Se revisaron patrones de credenciales antes de publicar. La fecha de corte está en el manifiesto; los mensajes posteriores a ese momento, incluido el aviso de publicación, no forman parte de ese corte.

El registro de decisiones está en [decisiones.md](decisiones.md). Las decisiones documentan el diseño de la aplicación y no sustituyen la conversación exigida por la consigna.
