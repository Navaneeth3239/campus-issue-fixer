import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/lib/services";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationService.list,
  });

  const list = Array.isArray(data) ? data : [];

  return {
    list,
    isLoading,
    unread: list.filter((n) => !n.read).length,
    markRead: async (id: string) => {
      await notificationService.markRead(id);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    markAllRead: async () => {
      await notificationService.markAllRead();
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  };
}
