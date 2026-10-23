import { getIngestSources } from '@/app/actions/ingest'
import IngestaManager from './ingesta-manager'

export default async function Page() {
  const sources = await getIngestSources()
  return <IngestaManager initialSources={sources} />
}
