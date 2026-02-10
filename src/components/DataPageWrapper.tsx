import { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DataPageWrapperProps {
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRefresh?: () => void;
  emptyMessage?: string;
  hasData?: boolean;
}

export const DataPageWrapper = ({
  children,
  isLoading = false,
  isError = false,
  error,
  onRefresh,
  emptyMessage = "No data available",
  hasData = true,
}: DataPageWrapperProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Fallback: invalidate all queries
      queryClient.invalidateQueries();
    }
  };

  // Show error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("common.somethingWentWrong")}</h3>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : t("common.unableToLoadData")}
        </p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t("common.loadingData")}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("common.noDataFound")}</h3>
        <p className="text-muted-foreground mb-4">{emptyMessage || t("common.noDataAvailable")}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("actions.refresh")}
        </Button>
      </div>
    );
  }

  // Show content with refresh option
  return (
    <div className="relative">
      {children}
      {/* Optional floating refresh button for manual updates */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="shadow-lg bg-background border-2"
          title={t("common.refreshData")}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};