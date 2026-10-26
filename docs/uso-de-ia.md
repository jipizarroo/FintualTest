# Uso de IA

Esta aplicación se desarrolló con asistencia de Codex dentro de T3 Code. El usuario definió el alcance, el límite de tiempo y el uso de TanStack, React y shadcn. Los agentes propusieron estructuras, escribieron código y colaboraron en su revisión.

La consigna permite usar LLM y exige compartir las conversaciones. Los archivos de esta carpeta conservan mensajes exportados de las herramientas de la sesión. No son una reconstrucción de una conversación ni una explicación inventada del razonamiento interno.

[conversaciones.jsonl](conversaciones.jsonl) contiene los mensajes de usuario y asistente de esta sesión y sus agentes, además de los encargos enviados a los agentes. Cada línea incluye la sesión de origen y su fecha. La exportación omite instrucciones internas del sistema, razonamiento privado y resultados de herramientas.

La exportación corresponde al momento de su generación. El hilo sigue abierto durante la implementación. Antes de enviar la postulación, se debe actualizar o adjuntar también la exportación final de la conversación desde T3 Code.

El registro de decisiones está en [decisiones.md](decisiones.md). Las decisiones documentan el diseño de la aplicación y no sustituyen la conversación exigida por la consigna.
