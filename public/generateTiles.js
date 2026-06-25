import sharp from 'sharp'

async function makeDZI(input, outputBase) {
  await sharp(input)
    .tile({
      size: 256,
      overlap: 1,
      layout: 'dz',
    })
    .toFile(outputBase)
}

await makeDZI('1920.jpg', 'tiles/1920')
await makeDZI('2020.jpg', 'tiles/2020')