import { getIngestSources } from '@/app/actions/ingest'
import IngestaManager from './ingesta-manager'

// Las server actions heredan este límite; 60 s es el máximo del plan free.
export const maxDuration = 60

export default async function Page() {
  const sources = await getIngestSources()
  return <IngestaManager initialSources={sources} />
}
