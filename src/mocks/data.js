// Mock responses for different climate-related questions
export const mockResponses = {
  'global warming': {
    response: `Global warming is primarily caused by the increase of **greenhouse gases** in Earth's atmosphere. These gases, including carbon dioxide (CO₂), methane (CH₄), and nitrous oxide (N₂O), trap heat from the sun and prevent it from escaping back into space.

The main sources of these greenhouse gases are:
- Burning fossil fuels (coal, oil, natural gas) for energy
- Deforestation, which reduces the number of trees absorbing CO₂
- Agriculture, especially livestock farming
- Industrial processes

Since the Industrial Revolution began in the mid-1700s, atmospheric CO₂ levels have risen by over 50%, from about 280 parts per million (ppm) to over 420 ppm today.`,
    sources: [
      {
        chunk_id: 'chunk_12',
        document_name: 'Climate_Basics_Unit3.pdf',
        excerpt: 'Greenhouse gases trap heat in the atmosphere, creating a warming effect similar to how a greenhouse traps warmth for plants. The primary greenhouse gases are carbon dioxide, methane, and nitrous oxide.',
        relevance_score: 0.94
      },
      {
        chunk_id: 'chunk_45',
        document_name: 'Climate_Basics_Unit3.pdf',
        excerpt: 'Carbon dioxide levels have risen by over 50% since pre-industrial times, primarily due to the burning of fossil fuels and deforestation.',
        relevance_score: 0.87
      }
    ]
  },
  'temperature measurement': {
    response: `Scientists measure Earth's temperature using several methods:

1. **Weather stations**: Thousands of stations around the world record daily temperatures using thermometers. These records go back over 150 years.

2. **Ocean buoys and ships**: Temperature sensors on buoys and ships measure sea surface temperatures across the oceans.

3. **Satellites**: Since 1979, satellites have measured temperatures in the atmosphere using infrared sensors.

4. **Ice cores**: By drilling into ice sheets in Antarctica and Greenland, scientists can analyze air bubbles trapped thousands of years ago to understand past temperatures.

5. **Tree rings**: The width of tree rings varies with temperature and can tell us about climate conditions in past centuries.

All these methods together show that Earth's average temperature has risen by about 1.1°C since 1850.`,
    sources: [
      {
        chunk_id: 'chunk_78',
        document_name: 'Measuring_Climate_Unit2.pdf',
        excerpt: 'Weather stations use calibrated thermometers to record daily maximum and minimum temperatures. The global network includes over 10,000 stations.',
        relevance_score: 0.91
      },
      {
        chunk_id: 'chunk_82',
        document_name: 'Measuring_Climate_Unit2.pdf',
        excerpt: 'Ice cores provide a historical record of atmospheric composition and temperature stretching back hundreds of thousands of years.',
        relevance_score: 0.85
      }
    ]
  },
  'carbon cycle': {
    response: `The **carbon cycle** is the process by which carbon moves between the atmosphere, oceans, land, and living things. It's essential for life on Earth!

**Natural carbon cycle processes:**
- **Photosynthesis**: Plants absorb CO₂ from the air and convert it into sugars and oxygen
- **Respiration**: Animals and plants release CO₂ when they breathe and decompose
- **Ocean absorption**: Oceans absorb about 25% of the CO₂ we emit
- **Volcanic eruptions**: Release CO₂ stored deep in Earth's crust

**Human impacts on the carbon cycle:**
- Burning fossil fuels releases carbon that was stored underground for millions of years
- Deforestation removes trees that would otherwise absorb CO₂
- Cement production releases CO₂ from limestone

When we release more carbon than natural processes can absorb, it accumulates in the atmosphere and causes warming.`,
    sources: [
      {
        chunk_id: 'chunk_101',
        document_name: 'Earth_Systems_Unit4.pdf',
        excerpt: 'The carbon cycle describes the continuous movement of carbon atoms between the atmosphere, oceans, biosphere, and geosphere.',
        relevance_score: 0.93
      },
      {
        chunk_id: 'chunk_105',
        document_name: 'Earth_Systems_Unit4.pdf',
        excerpt: 'Photosynthesis removes approximately 120 billion tonnes of carbon from the atmosphere each year, while respiration and decomposition return a similar amount.',
        relevance_score: 0.88
      }
    ]
  },
  default: {
    response: `That's a great question about climate science!

Based on the curriculum materials, I can tell you that understanding climate involves studying how Earth's atmosphere, oceans, land, and living things all interact together.

Some key concepts to explore:
- **Weather vs. Climate**: Weather is day-to-day conditions; climate is the average over many years
- **The greenhouse effect**: How certain gases trap heat in our atmosphere
- **Climate data**: How scientists measure and track changes over time

Would you like to learn more about any of these topics?`,
    sources: [
      {
        chunk_id: 'chunk_01',
        document_name: 'Climate_Introduction_Unit1.pdf',
        excerpt: 'Climate science is the study of long-term weather patterns and the factors that influence them, including atmospheric composition, ocean currents, and solar radiation.',
        relevance_score: 0.72
      }
    ]
  }
}

// Helper to find the best matching response
export function findMockResponse(message) {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('global warming') || lowerMessage.includes('greenhouse') || lowerMessage.includes('causes')) {
    return mockResponses['global warming']
  }
  if (lowerMessage.includes('temperature') || lowerMessage.includes('measure') || lowerMessage.includes('thermometer')) {
    return mockResponses['temperature measurement']
  }
  if (lowerMessage.includes('carbon') || lowerMessage.includes('cycle') || lowerMessage.includes('photosynthesis')) {
    return mockResponses['carbon cycle']
  }

  return mockResponses.default
}

// Generate unique IDs
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
