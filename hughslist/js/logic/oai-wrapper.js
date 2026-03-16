// logic/oai-wrapper.js

/**
 * Wraps a single record's XML content in a full OAI-PMH <oai:record>.
 * xmlContent = the inner XML your builder currently outputs (no <olac:olac> wrapper).
 */

export function wrapRecordInOAI(xmlContent) {
  return `
<oai:record>
  <oai:header>
    <oai:identifier></oai:identifier>
    <oai:datestamp></oai:datestamp>
  </oai:header>

  <oai:metadata>
    <olac:olac>
${xmlContent}
    </olac:olac>
  </oai:metadata>

  <oai:about>
    <provenance
        xmlns="http://www.openarchives.org/OAI/2.0/provenance"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/provenance
        http://www.openarchives.org/OAI/2.0/provenance.xsd">
      <originDescription harvestDate="" altered="">
        <baseURL></baseURL>
        <identifier></identifier>
        <datestamp></datestamp>
        <metadataNamespace>http://www.language-archives.org/OLAC/1.1/</metadataNamespace>
      </originDescription>
    </provenance>
  </oai:about>

</oai:record>
`.trim();
}

