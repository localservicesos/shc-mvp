import { ListPageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <ListPageSkeleton withButton={false} cols={5} />;
}
