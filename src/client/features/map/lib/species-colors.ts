// Canonical color for each speciesGroupName.
// Uses the color from the seed row where speciesName === groupName
// (e.g. Bear -> #F3923F from the "Bear" row, not Grizzly's #AD2147).
const speciesColors: Record<string, string> = {
  Badger: '#C1E3D8',
  Bear: '#F3923F',
  Beaver: '#FCCF31',
  Bobcat: '#EE5C30',
  Buffalo: '#7F2F8B',
  Caribou: '#C59FC8',
  Cougar: '#FEE3C0',
  Coyote: '#927E7A',
  Deer: '#BAA7A2',
  Eagle: '#DCDDDE',
  Elk: '#D3CB8D',
  Fox: '#32A7DC',
  'Horned Owl': '#F5C2D7',
  Lynx: '#91632D',
  Marten: '#808083',
  Moose: '#8AC04B',
  Muskrat: '#A3C497',
  Otter: '#0C6F47',
  Porcupine: '#4C5FA7',
  Possum: '#A3B5DB',
  Rabbit: '#EA212E',
  Raccoon: '#BE953B',
  Sheep: '#008D82',
  Skunk: '#E6E7E8',
  Unknown: '#323232',
  Wolf: '#8A5A7C',
}

export { speciesColors }
