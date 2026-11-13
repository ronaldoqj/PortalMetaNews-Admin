import { Container, Group, SimpleGrid, Skeleton, Stack, VisuallyHidden } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Card } from "../ui/card";

/** Announced once to assistive technology; the shapes themselves are decorative. */
function LoadingLabel() {
  const translate = useTranslations("Common");
  return <VisuallyHidden>{translate("loading")}</VisuallyHidden>;
}

function Lines({ widths }: { widths: string[] }) {
  return <Stack gap="sm">{widths.map((width, index) => <Skeleton key={index} height={12} width={width} radius="sm" />)}</Stack>;
}

/**
 * The panel's and console's page while its data arrives (`loading.tsx`): shown at once on navigation, inside
 * the frame that stays, and replaced as soon as the page streams in. It holds nothing about the account.
 */
export function AdminPageSkeleton() {
  return <Stack gap="lg" role="status" aria-busy="true">
    <LoadingLabel />
    <Stack gap="xs" aria-hidden="true">
      <Skeleton height={28} width="40%" maw={360} radius="sm" />
      <Skeleton height={14} width="65%" maw={560} radius="sm" />
    </Stack>
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" aria-hidden="true">
      {[0, 1, 2].map((key) => <Card key={key} withBorder radius="md" p="lg">
        <Stack gap="sm"><Skeleton height={12} width="50%" radius="sm" /><Skeleton height={24} width="35%" radius="sm" /></Stack>
      </Card>)}
    </SimpleGrid>
    <Card withBorder radius="md" p="lg" aria-hidden="true">
      <Stack gap="lg">
        <Group justify="space-between"><Skeleton height={18} width="30%" radius="sm" /><Skeleton height={32} width={120} radius="sm" /></Group>
        <Lines widths={["100%", "92%", "96%", "88%", "94%", "70%"]} />
      </Stack>
    </Card>
  </Stack>;
}

/** The site's page while its news arrive: a headline block and a grid of cards. */
export function SitePageSkeleton() {
  return <Container size="lg" py="xl">
    <LoadingLabel />
    <Stack gap="xl" aria-hidden="true">
      <Skeleton height={320} radius="md" />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {[0, 1, 2, 3, 4, 5].map((index) => <Stack key={index} gap="sm"><Skeleton height={160} radius="md" /><Lines widths={["90%", "70%"]} /></Stack>)}
      </SimpleGrid>
    </Stack>
  </Container>;
}
