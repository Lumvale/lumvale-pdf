const fs = require('fs');
const { Document, Packer, Paragraph, TextRun } = require('docx');

async function createDocx() {
    const doc = new Document({
        sections: [{
            properties: {},
            children: Array.from({ length: 50 }).map((_, i) => new Paragraph({
                children: [
                    new TextRun(`This is paragraph number ${i}. It is meant to be a very long paragraph that spans multiple lines so we can test the pagination logic of the docx-preview rendering process to ensure it works correctly.`)
                ]
            })),
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync('tests/fixtures/test.docx', buffer);
    console.log('Created tests/fixtures/test.docx');
}
createDocx();
