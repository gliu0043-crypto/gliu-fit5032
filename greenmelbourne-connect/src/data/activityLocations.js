// Approximate, fictional meeting points for the coursework catalogue.
// These are not confirmed venues or invitations to real events.
const suburbPoints = {
  Clayton: [-37.9252, 145.1198],
  'Box Hill': [-37.8192, 145.1235],
  Yarra: [-37.8049, 144.9984],
  Richmond: [-37.8239, 144.9983],
  Carlton: [-37.7973, 144.9671],
  Brunswick: [-37.7677, 144.9610],
  Footscray: [-37.8000, 144.8993],
  'Glen Waverley': [-37.8795, 145.1640],
  Hawthorn: [-37.8215, 145.0358],
  Coburg: [-37.7435, 144.9663],
  Preston: [-37.7388, 145.0039],
  Northcote: [-37.7695, 144.9990],
  Fitzroy: [-37.7986, 144.9785],
  'South Yarra': [-37.8392, 144.9923],
  'St Kilda': [-37.8676, 144.9807],
  Elwood: [-37.8820, 144.9827],
  Caulfield: [-37.8824, 145.0257],
  Carnegie: [-37.8890, 145.0571],
  Oakleigh: [-37.9000, 145.0880],
  'Mount Waverley': [-37.8750, 145.1280],
  Burwood: [-37.8490, 145.1120],
  Doncaster: [-37.7880, 145.1260],
  Heidelberg: [-37.7560, 145.0670],
  Ivanhoe: [-37.7690, 145.0430],
  Kensington: [-37.7940, 144.9300],
  'Ascot Vale': [-37.7750, 144.9230],
  Essendon: [-37.7560, 144.9160],
  'Moonee Ponds': [-37.7660, 144.9190],
}

export function getActivityLocation(activity) {
  const point = suburbPoints[activity?.suburb]
  if (!point) return null
  return { lat: point[0], lon: point[1], label: `${activity.suburb} sample meeting point` }
}
