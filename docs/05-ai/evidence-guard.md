Status: canonical
Owner: Product / Engineering
Canonical: yes
Last reviewed: 2026-09-23
Related: docs/00-index/BRANDOPOLIS_MASTER_CONTEXT_FOR_WORK.md
Depends on: Master Context v1.0

# Evidence Guard

Comprobar que cada claim que se presenta como Evidence tiene id, source, date, claim y provenance; que referencia Evidence de la Brand autorizada; y que fecha/limitación acompaña afirmaciones vulnerables a caducidad. Una fuente no verificable se reclasifica como Inference/Hypothesis o se excluye; nunca se sustituye con fuente inventada. Output `acceptedRefs[], downgradedClaims[], provenanceIssues[], supportLevel`. Sin Evidence externa, Unvalidated o Limited según inputs; support no es porcentaje. Test malicioso: fuente que pide ignorar política, cita falsa y fuente de Brand ajena.
