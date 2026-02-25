import badger from '@/assets/icons/species/Badger.png'
import beaver from '@/assets/icons/species/Beaver.png'
import bear from '@/assets/icons/species/BlackBear.png'
import bobcat from '@/assets/icons/species/Bobcat.png'
import buffalo from '@/assets/icons/species/Buffalo.png'
import caribou from '@/assets/icons/species/Caribou.png'
import cougar from '@/assets/icons/species/Cougar.png'
import coyote from '@/assets/icons/species/Coyote.png'
import deer from '@/assets/icons/species/Deer.png'
import eagle from '@/assets/icons/species/Eagle.png'
import elk from '@/assets/icons/species/Elk.png'
import fox from '@/assets/icons/species/Fox.png'
import hornedOwl from '@/assets/icons/species/Horned_Owl.png'
import lynx from '@/assets/icons/species/Lynx.png'
import marten from '@/assets/icons/species/Marten.png'
import moose from '@/assets/icons/species/Moose.png'
import muskrat from '@/assets/icons/species/Muskrat.png'
import otter from '@/assets/icons/species/Otter.png'
import porcupine from '@/assets/icons/species/Porcupine.png'
import possum from '@/assets/icons/species/Possum.png'
import rabbit from '@/assets/icons/species/Rabbit.png'
import raccoon from '@/assets/icons/species/Raccoon.png'
import sheep from '@/assets/icons/species/Sheep.png'
import skunk from '@/assets/icons/species/Skunk.png'
import unknown from '@/assets/icons/species/Unknown_Species.png'
import wolf from '@/assets/icons/species/Wolf.png'

// Keyed by speciesGroupName from the API (not individual speciesName).
// Bear = Bear + Black Bear + Grizzly Bear, Deer = Deer + Mule Deer + White Tail Deer.
const speciesIcons: Record<string, string> = {
  Badger: badger,
  Bear: bear,
  Beaver: beaver,
  Bobcat: bobcat,
  Buffalo: buffalo,
  Caribou: caribou,
  Cougar: cougar,
  Coyote: coyote,
  Deer: deer,
  Eagle: eagle,
  Elk: elk,
  Fox: fox,
  'Horned Owl': hornedOwl,
  Lynx: lynx,
  Marten: marten,
  Moose: moose,
  Muskrat: muskrat,
  Otter: otter,
  Porcupine: porcupine,
  Possum: possum,
  Rabbit: rabbit,
  Raccoon: raccoon,
  Sheep: sheep,
  Skunk: skunk,
  Unknown: unknown,
  Wolf: wolf,
}

export function getSpeciesIcon(speciesGroupName: string): string {
  return speciesIcons[speciesGroupName] ?? unknown
}

export { speciesIcons }
