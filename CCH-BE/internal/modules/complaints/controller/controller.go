package controller

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

const responseTimestampLayout = "2006-01-02T15:04:05Z"

type OpenCallCenterComplaintLister interface {
	ListOpenForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.ComplaintListQuery) ([]complaints.ComplaintSummary, error)
	ListDashboardReceivedOpen(context.Context, authentication.VerifiedIdentity, complaints.ComplaintListQuery) ([]complaints.ComplaintSummary, error)
	ListDashboardSentOpen(context.Context, authentication.VerifiedIdentity, complaints.ComplaintListQuery) ([]complaints.ComplaintSummary, error)
	ListReceivedOpenReport(context.Context, authentication.VerifiedIdentity, complaints.ReceivedOpenReportQuery) ([]complaints.ReceivedOpenReportRow, error)
	ListSentOpenReport(context.Context, authentication.VerifiedIdentity, complaints.SentOpenReportQuery) ([]complaints.SentOpenReportRow, error)
	ListReceivedUnrespondedReport(context.Context, authentication.VerifiedIdentity, complaints.ReceivedUnrespondedReportQuery) ([]complaints.ReceivedUnrespondedReportRow, error)
	ListSentUnrespondedReport(context.Context, authentication.VerifiedIdentity, complaints.SentUnrespondedReportQuery) ([]complaints.SentUnrespondedReportRow, error)
	ListSentSummary(context.Context, authentication.VerifiedIdentity, complaints.SentSummaryQuery) ([]complaints.SentSummaryRow, error)
	ListReceivedSummary(context.Context, authentication.VerifiedIdentity, complaints.ReceivedSummaryQuery) ([]complaints.ReceivedSummaryRow, error)
	ListBreakdown(context.Context, authentication.VerifiedIdentity, complaints.BreakdownQuery) ([]complaints.BreakdownRow, error)
	ListBreakdownDetail(context.Context, authentication.VerifiedIdentity, complaints.BreakdownDetailQuery) ([]complaints.ReceivedOpenReportRow, error)
	ListDurationSummary(context.Context, authentication.VerifiedIdentity, complaints.DurationSummaryQuery) ([]complaints.DurationSummaryRow, error)
	ListDurationDetail(context.Context, authentication.VerifiedIdentity, complaints.DurationDetailQuery) ([]complaints.DurationDetailRow, error)
	ListStatusComplaints(context.Context, authentication.VerifiedIdentity, complaints.StatusListQuery) (complaints.StatusListResult, error)
	CountReceivedOpenDurationBuckets(context.Context, authentication.VerifiedIdentity, complaints.ReceivedOpenDurationQuery) (complaints.ReceivedOpenDurationBuckets, error)
	CountSentOpenDurationBuckets(context.Context, authentication.VerifiedIdentity, complaints.SentOpenDurationQuery) (complaints.SentOpenDurationBuckets, error)
	ListCompletedForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.ComplaintListQuery) ([]complaints.ComplaintSummary, error)
	CountCompletedForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.CompletedCountQuery) (int64, error)
	CountOpenForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	CountReceivedOpenForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	CountSentOpenForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	CountRequestCloseForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	CountDashboardOpen(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	CountDashboardReceivedOpen(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	CountDashboardSentOpen(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	CountDashboardCompleted(context.Context, authentication.VerifiedIdentity, complaints.CompletedCountQuery) (int64, error)
	CountDashboardRequestClose(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)
	ExportOpenForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.ComplaintListQuery) ([]complaints.ComplaintSummary, error)
	ListOpenTicketHistoryForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.ComplaintHistoryQuery) ([]complaints.ComplaintStatusHistoryEntry, error)
	ListCompletedTicketHistoryForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.ComplaintHistoryQuery) ([]complaints.ComplaintStatusHistoryEntry, error)
	GetOpenForCallCenter(context.Context, authentication.VerifiedIdentity, string) (complaints.ComplaintDetail, error)
	GetCompletedForCallCenter(context.Context, authentication.VerifiedIdentity, string) (complaints.ComplaintDetail, error)
	ListCallCenterStatusOptions(context.Context, authentication.VerifiedIdentity, string) ([]complaints.ComplaintStatusOption, error)
	ListStatusOptions(context.Context, authentication.VerifiedIdentity, string) ([]complaints.ComplaintStatusOption, error)
}

type Controller struct {
	service OpenCallCenterComplaintLister
}

type listResponse struct {
	Data       []complaintItem  `json:"data"`
	Pagination paginationResult `json:"pagination"`
}

type complaintItem struct {
	ID                    string `json:"id"`
	OriginOfficeCode      string `json:"origin_office_code"`
	DestinationOfficeCode string `json:"destination_office_code"`
	CopyOfficeCodes       string `json:"copy_office_codes"`
	AllTargetOfficeCodes  string `json:"all_target_office_codes"`
	ShipmentNumber        string `json:"shipment_number"`
	ComplaintDate         any    `json:"complaint_date"`
	Summary               string `json:"summary"`
	StatusCode            string `json:"status_code"`
	StatusDate            string `json:"status_date"`
	StatusOfficeCode      string `json:"status_office_code"`
}

type paginationResult struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

type historyResponse struct {
	Data       []historyItem    `json:"data"`
	Pagination paginationResult `json:"pagination"`
}

type detailResponse struct {
	Data detailItem `json:"data"`
}

type statusOptionsResponse struct {
	Data []statusOptionItem `json:"data"`
}

type receivedOpenReportResponse struct {
	Data       []receivedOpenReportItem `json:"data"`
	Pagination paginationResult         `json:"pagination"`
}

type receivedOpenReportItem struct {
	ComplaintID                   string `json:"complaint_id"`
	TargetOfficeUpdateCode        string `json:"target_office_update_code"`
	OriginOfficeUpdateCode        string `json:"origin_office_update_code"`
	ShipmentNumber                string `json:"shipment_number"`
	ShipmentTypeCode              string `json:"shipment_type_code"`
	ComplaintCreatedAt            string `json:"complaint_created_at"`
	ShipmentDestinationOfficeCode string `json:"shipment_destination_office_code"`
	LatestStatusCode              string `json:"latest_status_code"`
	LatestStatusDescription       string `json:"latest_status_description"`
	LatestStatusOfficeCode        string `json:"latest_status_office_code"`
	LatestStatusAt                string `json:"latest_status_at"`
	DurationSeconds               int64  `json:"duration_seconds"`
}

type sentOpenReportResponse struct {
	Data       []sentOpenReportItem `json:"data"`
	Pagination paginationResult     `json:"pagination"`
}

type sentOpenReportItem struct {
	ComplaintID                   string `json:"complaint_id"`
	OriginOfficeUpdateCode        string `json:"origin_office_update_code"`
	ShipmentNumber                string `json:"shipment_number"`
	ShipmentTypeCode              string `json:"shipment_type_code"`
	ComplaintCreatedAt            string `json:"complaint_created_at"`
	ShipmentDestinationOfficeCode string `json:"shipment_destination_office_code"`
	LatestStatusCode              string `json:"latest_status_code"`
	LatestStatusDescription       string `json:"latest_status_description"`
	LatestStatusOfficeCode        string `json:"latest_status_office_code"`
	LatestStatusAt                string `json:"latest_status_at"`
	DurationSeconds               int64  `json:"duration_seconds"`
}

type sentSummaryItem struct {
	OfficeCode     string  `json:"office_code"`
	OfficeName     string  `json:"office_name"`
	Total          int64   `json:"total"`
	Completed      int64   `json:"completed"`
	CompletedPct   float64 `json:"completed_percent"`
	Open           int64   `json:"open"`
	OpenPct        float64 `json:"open_percent"`
	Responded      int64   `json:"responded"`
	RespondedPct   float64 `json:"responded_percent"`
	Unresponded    int64   `json:"unresponded"`
	UnrespondedPct float64 `json:"unresponded_percent"`
}

type sentSummaryResponse struct {
	Data       []sentSummaryItem `json:"data"`
	Pagination paginationResult  `json:"pagination"`
}

type breakdownItem struct {
	Code    string  `json:"code"`
	Label   string  `json:"label"`
	Count   int64   `json:"count"`
	Percent float64 `json:"percent"`
}

type breakdownResponse struct {
	Data    []breakdownItem `json:"data"`
	Total   int64           `json:"total"`
	Percent float64         `json:"percent"`
}

type receivedOpenDurationResponse struct {
	DayZero            int64   `json:"day_zero"`
	DayZeroPercent     float64 `json:"day_zero_percent"`
	DayOne             int64   `json:"day_one"`
	DayOnePercent      float64 `json:"day_one_percent"`
	DayTwo             int64   `json:"day_two"`
	DayTwoPercent      float64 `json:"day_two_percent"`
	DayThree           int64   `json:"day_three"`
	DayThreePercent    float64 `json:"day_three_percent"`
	DayFourPlus        int64   `json:"day_four_plus"`
	DayFourPlusPercent float64 `json:"day_four_plus_percent"`
	Total              int64   `json:"total"`
}

type completedCountResponse struct {
	Count int64 `json:"count"`
}

type statusOptionItem struct {
	Code        string `json:"code"`
	Description string `json:"description"`
}

type detailItem struct {
	ID                    string  `json:"id"`
	CustomerName          string  `json:"customer_name"`
	CustomerEmail         string  `json:"customer_email"`
	CustomerPhone         string  `json:"customer_phone"`
	CustomerAddress       string  `json:"customer_address"`
	OriginOfficeCode      string  `json:"origin_office_code"`
	DestinationOfficeCode string  `json:"destination_office_code"`
	CopyOfficeCodes       string  `json:"copy_office_codes"`
	AllTargetOfficeCodes  string  `json:"all_target_office_codes"`
	ComplaintTypeCode     int64   `json:"complaint_type_code"`
	ComplaintSourceCode   int64   `json:"complaint_source_code"`
	ShipmentTypeCode      string  `json:"shipment_type_code"`
	ShipmentNumber        string  `json:"shipment_number"`
	ComplaintDate         *string `json:"complaint_date"`
	ShipmentOriginOffice  string  `json:"shipment_origin_office_code"`
	ShipmentTargetOffice  string  `json:"shipment_target_office_code"`
	Summary               string  `json:"summary"`
	Description           string  `json:"description"`
	StatusCode            string  `json:"status_code"`
	StatusDescription     string  `json:"status_description"`
	StatusDate            string  `json:"status_date"`
	StatusOfficeCode      string  `json:"status_office_code"`
	RequestStatus         string  `json:"request_status"`
}

type historyItem struct {
	ComplaintID       string `json:"complaint_id"`
	HistoryID         string `json:"history_id"`
	StatusCode        string `json:"status_code"`
	StatusDescription string `json:"status_description"`
	OriginOfficeCode  string `json:"origin_office_code"`
	Description       string `json:"description"`
	UpdatedAt         string `json:"updated_at"`
	UpdatedBy         string `json:"updated_by"`
	DurationSeconds   *int64 `json:"duration_seconds"`
}

func New(service OpenCallCenterComplaintLister) *Controller {
	return &Controller{service: service}
}

func (controller *Controller) Register(router fiber.Router) {
	router.Get("/complaints/call-center/open", controller.ListOpenForCallCenter)
	router.Get("/complaints/call-center/open/export", controller.ExportOpenForCallCenter)
	router.Get("/complaints/call-center/open/count", controller.CountOpenForCallCenter)
	router.Get("/complaints/call-center/received-open/count", controller.CountReceivedOpenForCallCenter)
	router.Get("/complaints/call-center/sent-open/count", controller.CountSentOpenForCallCenter)
	router.Get("/complaints/call-center/request-close/count", controller.CountRequestCloseForCallCenter)
	router.Get("/complaints/dashboard/open/count", controller.CountDashboardOpen)
	router.Get("/complaints/dashboard/received-open/count", controller.CountDashboardReceivedOpen)
	router.Get("/complaints/dashboard/sent-open/count", controller.CountDashboardSentOpen)
	router.Get("/complaints/dashboard/completed/count", controller.CountDashboardCompleted)
	router.Get("/complaints/dashboard/request-close/count", controller.CountDashboardRequestClose)
	router.Get("/complaints/dashboard/received-open", controller.ListDashboardReceivedOpen)
	router.Get("/complaints/dashboard/sent-open", controller.ListDashboardSentOpen)
	router.Get("/complaints/reports/received-open", controller.ListReceivedOpenReport)
	router.Get("/complaints/reports/received-unresponded", controller.ListReceivedUnrespondedReport)
	router.Get("/complaints/reports/received-open/duration-buckets", controller.CountReceivedOpenDurationBuckets)
	router.Get("/complaints/reports/duration-summary", controller.ListDurationSummary)
	router.Get("/complaints/reports/duration-detail", controller.ListDurationDetail)
	router.Get("/complaints/reports/received-summary", controller.ListReceivedSummary)
	router.Get("/complaints/reports/received-per-shipment", func(ctx fiber.Ctx) error {
		return controller.ListBreakdown(ctx, complaints.BreakdownDirectionReceived, complaints.BreakdownKindShipment)
	})
	router.Get("/complaints/reports/received-per-shipment/detail", func(ctx fiber.Ctx) error {
		return controller.ListBreakdownDetail(ctx, complaints.BreakdownDirectionReceived, complaints.BreakdownKindShipment)
	})
	router.Get("/complaints/reports/received-per-problem", func(ctx fiber.Ctx) error {
		return controller.ListBreakdown(ctx, complaints.BreakdownDirectionReceived, complaints.BreakdownKindProblem)
	})
	router.Get("/complaints/reports/received-per-problem/detail", func(ctx fiber.Ctx) error {
		return controller.ListBreakdownDetail(ctx, complaints.BreakdownDirectionReceived, complaints.BreakdownKindProblem)
	})
	router.Get("/complaints/reports/sent-open", controller.ListSentOpenReport)
	router.Get("/complaints/reports/sent-unresponded", controller.ListSentUnrespondedReport)
	router.Get("/complaints/reports/sent-summary", controller.ListSentSummary)
	router.Get("/complaints/reports/sent-per-shipment", func(ctx fiber.Ctx) error {
		return controller.ListBreakdown(ctx, complaints.BreakdownDirectionSent, complaints.BreakdownKindShipment)
	})
	router.Get("/complaints/reports/sent-per-shipment/detail", func(ctx fiber.Ctx) error {
		return controller.ListBreakdownDetail(ctx, complaints.BreakdownDirectionSent, complaints.BreakdownKindShipment)
	})
	router.Get("/complaints/reports/sent-per-problem", func(ctx fiber.Ctx) error {
		return controller.ListBreakdown(ctx, complaints.BreakdownDirectionSent, complaints.BreakdownKindProblem)
	})
	router.Get("/complaints/reports/sent-per-problem/detail", func(ctx fiber.Ctx) error {
		return controller.ListBreakdownDetail(ctx, complaints.BreakdownDirectionSent, complaints.BreakdownKindProblem)
	})
	router.Get("/complaints/reports/sent-open/duration-buckets", controller.CountSentOpenDurationBuckets)
	router.Get("/complaints/status-list", controller.ListStatusComplaints)
	router.Get("/complaints/status/belum-respon-terima", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "received", "belum_respon")
	})
	router.Get("/complaints/status/belum-respon-kirim", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "sent", "belum_respon")
	})
	router.Get("/complaints/status/masih-terbuka-terima", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "received", "masih_terbuka")
	})
	router.Get("/complaints/status/masih-terbuka-kirim", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "sent", "masih_terbuka")
	})
	router.Get("/complaints/status/sudah-respon-terima", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "received", "sudah_respon")
	})
	router.Get("/complaints/status/sudah-respon-kirim", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "sent", "sudah_respon")
	})
	router.Get("/complaints/status/sudah-selesai-terima", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "received", "sudah_selesai")
	})
	router.Get("/complaints/status/sudah-selesai-kirim", func(ctx fiber.Ctx) error {
		return controller.listStatusComplaintsWithParams(ctx, "sent", "sudah_selesai")
	})
	router.Get("/complaints/call-center/completed", controller.ListCompletedForCallCenter)
	router.Get("/complaints/call-center/completed/count", controller.CountCompletedForCallCenter)
	router.Get("/complaints/call-center/completed/:id", controller.GetCompletedForCallCenter)
	router.Get("/complaints/call-center/completed/:id/history", controller.ListCompletedTicketHistoryForCallCenter)
	router.Get("/complaints/call-center/:id", controller.GetOpenForCallCenter)
	router.Get("/complaints/call-center/:id/history", controller.ListOpenTicketHistoryForCallCenter)
	router.Get("/complaints/call-center/:id/status-options", controller.ListCallCenterStatusOptions)
	router.Get("/complaints/:id/status-options", controller.ListStatusOptions)
}

func (controller *Controller) ListCompletedForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	complaintSummaries, err := controller.service.ListCompletedForCallCenter(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]complaintItem, 0, len(complaintSummaries))
	for _, summary := range complaintSummaries {
		items = append(items, mapComplaintItem(summary))
	}
	return ctx.JSON(listResponse{Data: items, Pagination: paginationResult{Limit: query.Limit, Offset: query.Offset}})
}

func (controller *Controller) CountCompletedForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	count, err := controller.service.CountCompletedForCallCenter(ctx.Context(), identity, complaints.CompletedCountQuery{From: from, To: to})
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(completedCountResponse{Count: count})
}

func (controller *Controller) CountOpenForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	count, err := controller.service.CountOpenForCallCenter(ctx.Context(), identity, complaints.OpenCountQuery{From: from, To: to})
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(completedCountResponse{Count: count})
}

func (controller *Controller) CountReceivedOpenForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	return controller.countOpenForCallCenter(ctx, controller.service.CountReceivedOpenForCallCenter)
}

func (controller *Controller) CountSentOpenForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	return controller.countOpenForCallCenter(ctx, controller.service.CountSentOpenForCallCenter)
}

func (controller *Controller) CountRequestCloseForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	return controller.countOpenForCallCenter(ctx, controller.service.CountRequestCloseForCallCenter)
}

func (controller *Controller) countOpenForCallCenter(ctx fiber.Ctx, count func(context.Context, authentication.VerifiedIdentity, complaints.OpenCountQuery) (int64, error)) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	value, err := count(ctx.Context(), identity, complaints.OpenCountQuery{From: from, To: to})
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(completedCountResponse{Count: value})
}

func (controller *Controller) CountDashboardOpen(ctx fiber.Ctx) error {
	return controller.countDashboard(ctx, func(ctx context.Context, identity authentication.VerifiedIdentity, query complaints.CompletedCountQuery) (int64, error) {
		return controller.service.CountDashboardOpen(ctx, identity, query)
	})
}

func (controller *Controller) CountDashboardReceivedOpen(ctx fiber.Ctx) error {
	return controller.countDashboard(ctx, func(ctx context.Context, identity authentication.VerifiedIdentity, query complaints.CompletedCountQuery) (int64, error) {
		return controller.service.CountDashboardReceivedOpen(ctx, identity, query)
	})
}

func (controller *Controller) CountDashboardSentOpen(ctx fiber.Ctx) error {
	return controller.countDashboard(ctx, func(ctx context.Context, identity authentication.VerifiedIdentity, query complaints.CompletedCountQuery) (int64, error) {
		return controller.service.CountDashboardSentOpen(ctx, identity, query)
	})
}

func (controller *Controller) CountDashboardCompleted(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	return controller.countDashboard(ctx, controller.service.CountDashboardCompleted)
}

func (controller *Controller) CountDashboardRequestClose(ctx fiber.Ctx) error {
	return controller.countDashboard(ctx, func(ctx context.Context, identity authentication.VerifiedIdentity, query complaints.CompletedCountQuery) (int64, error) {
		return controller.service.CountDashboardRequestClose(ctx, identity, query)
	})
}

func (controller *Controller) ListDashboardReceivedOpen(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	return controller.listDashboardOpen(ctx, controller.service.ListDashboardReceivedOpen)
}

func (controller *Controller) ListDashboardSentOpen(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	return controller.listDashboardOpen(ctx, controller.service.ListDashboardSentOpen)
}

func (controller *Controller) ListReceivedOpenReport(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	page, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	query := complaints.ReceivedOpenReportQuery{
		From:        from,
		To:          to,
		ProductCode: strings.TrimSpace(ctx.Query("product_code")),
		Limit:       page.Limit,
		Offset:      page.Offset,
	}
	rows, err := controller.service.ListReceivedOpenReport(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]receivedOpenReportItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, receivedOpenReportItem{
			ComplaintID:                   row.ComplaintID,
			TargetOfficeUpdateCode:        row.TargetOfficeUpdateCode,
			OriginOfficeUpdateCode:        row.OriginOfficeUpdateCode,
			ShipmentNumber:                row.ShipmentNumber,
			ShipmentTypeCode:              row.ShipmentTypeCode,
			ComplaintCreatedAt:            row.ComplaintCreatedAt.UTC().Format(responseTimestampLayout),
			ShipmentDestinationOfficeCode: row.ShipmentDestinationOfficeCode,
			LatestStatusCode:              row.LatestStatusCode,
			LatestStatusDescription:       row.LatestStatusDescription,
			LatestStatusOfficeCode:        row.LatestStatusOfficeCode,
			LatestStatusAt:                row.LatestStatusAt.UTC().Format(responseTimestampLayout),
			DurationSeconds:               row.DurationSeconds,
		})
	}
	return ctx.JSON(receivedOpenReportResponse{Data: items, Pagination: paginationResult{Limit: page.Limit, Offset: page.Offset}})
}

func (controller *Controller) ListSentOpenReport(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	page, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	query := complaints.SentOpenReportQuery{
		From:        from,
		To:          to,
		ProductCode: strings.TrimSpace(ctx.Query("product_code")),
		Limit:       page.Limit,
		Offset:      page.Offset,
	}
	rows, err := controller.service.ListSentOpenReport(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]sentOpenReportItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, sentOpenReportItem{
			ComplaintID:                   row.ComplaintID,
			OriginOfficeUpdateCode:        row.OriginOfficeUpdateCode,
			ShipmentNumber:                row.ShipmentNumber,
			ShipmentTypeCode:              row.ShipmentTypeCode,
			ComplaintCreatedAt:            row.ComplaintCreatedAt.UTC().Format(responseTimestampLayout),
			ShipmentDestinationOfficeCode: row.ShipmentDestinationOfficeCode,
			LatestStatusCode:              row.LatestStatusCode,
			LatestStatusDescription:       row.LatestStatusDescription,
			LatestStatusOfficeCode:        row.LatestStatusOfficeCode,
			LatestStatusAt:                row.LatestStatusAt.UTC().Format(responseTimestampLayout),
			DurationSeconds:               row.DurationSeconds,
		})
	}
	return ctx.JSON(sentOpenReportResponse{Data: items, Pagination: paginationResult{Limit: page.Limit, Offset: page.Offset}})
}

func (controller *Controller) ListReceivedUnrespondedReport(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	page, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	query := complaints.ReceivedUnrespondedReportQuery{
		From:         from,
		To:           to,
		ProductCode:  strings.TrimSpace(ctx.Query("product_code")),
		RegionalCode: strings.TrimSpace(ctx.Query("regional")),
		OfficeCode:   strings.TrimSpace(ctx.Query("office")),
		Limit:        page.Limit,
		Offset:       page.Offset,
	}
	rows, err := controller.service.ListReceivedUnrespondedReport(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]receivedOpenReportItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, receivedOpenReportItem{
			ComplaintID:                   row.ComplaintID,
			TargetOfficeUpdateCode:        row.TargetOfficeUpdateCode,
			OriginOfficeUpdateCode:        row.OriginOfficeUpdateCode,
			ShipmentNumber:                row.ShipmentNumber,
			ShipmentTypeCode:              row.ShipmentTypeCode,
			ComplaintCreatedAt:            row.ComplaintCreatedAt.UTC().Format(responseTimestampLayout),
			ShipmentDestinationOfficeCode: row.ShipmentDestinationOfficeCode,
			LatestStatusCode:              row.LatestStatusCode,
			LatestStatusDescription:       row.LatestStatusDescription,
			LatestStatusOfficeCode:        row.LatestStatusOfficeCode,
			LatestStatusAt:                row.LatestStatusAt.UTC().Format(responseTimestampLayout),
			DurationSeconds:               row.DurationSeconds,
		})
	}
	return ctx.JSON(receivedOpenReportResponse{Data: items, Pagination: paginationResult{Limit: page.Limit, Offset: page.Offset}})
}

func (controller *Controller) ListSentUnrespondedReport(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	page, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	query := complaints.SentUnrespondedReportQuery{
		From:         from,
		To:           to,
		ProductCode:  strings.TrimSpace(ctx.Query("product_code")),
		RegionalCode: strings.TrimSpace(ctx.Query("regional")),
		OfficeCode:   strings.TrimSpace(ctx.Query("office")),
		Limit:        page.Limit,
		Offset:       page.Offset,
	}
	rows, err := controller.service.ListSentUnrespondedReport(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]sentOpenReportItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, sentOpenReportItem{
			ComplaintID:                   row.ComplaintID,
			OriginOfficeUpdateCode:        row.OriginOfficeUpdateCode,
			ShipmentNumber:                row.ShipmentNumber,
			ShipmentTypeCode:              row.ShipmentTypeCode,
			ComplaintCreatedAt:            row.ComplaintCreatedAt.UTC().Format(responseTimestampLayout),
			ShipmentDestinationOfficeCode: row.ShipmentDestinationOfficeCode,
			LatestStatusCode:              row.LatestStatusCode,
			LatestStatusDescription:       row.LatestStatusDescription,
			LatestStatusOfficeCode:        row.LatestStatusOfficeCode,
			LatestStatusAt:                row.LatestStatusAt.UTC().Format(responseTimestampLayout),
			DurationSeconds:               row.DurationSeconds,
		})
	}
	return ctx.JSON(sentOpenReportResponse{Data: items, Pagination: paginationResult{Limit: page.Limit, Offset: page.Offset}})
}

func (controller *Controller) ListSentSummary(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	limit, offset, err := parsePaginationCustom(ctx, complaints.MaxSummaryReportPageSize)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	query := complaints.SentSummaryQuery{
		From:         from,
		To:           to,
		ProductCode:  strings.TrimSpace(ctx.Query("product_code")),
		RegionalCode: strings.TrimSpace(ctx.Query("regional")),
		Limit:        limit,
		Offset:       offset,
	}
	rows, err := controller.service.ListSentSummary(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]sentSummaryItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, sentSummaryItem{
			OfficeCode: row.OfficeCode, OfficeName: row.OfficeName,
			Total: row.Total, Completed: row.Completed, CompletedPct: reportPercentage(row.Completed, row.Total),
			Open: row.Open, OpenPct: reportPercentage(row.Open, row.Total),
			Responded: row.Responded, RespondedPct: reportPercentage(row.Responded, row.Total),
			Unresponded: row.Unresponded, UnrespondedPct: reportPercentage(row.Unresponded, row.Total),
		})
	}
	return ctx.JSON(sentSummaryResponse{Data: items, Pagination: paginationResult{Limit: limit, Offset: offset}})
}

func (controller *Controller) ListReceivedSummary(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	limit, offset, err := parsePaginationCustom(ctx, complaints.MaxSummaryReportPageSize)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	onlyTarget := false
	switch strings.ToLower(strings.TrimSpace(ctx.Query("hanya_tujuan"))) {
	case "on", "1", "true":
		onlyTarget = true
	}
	query := complaints.ReceivedSummaryQuery{
		From:         from,
		To:           to,
		ProductCode:  strings.TrimSpace(ctx.Query("product_code")),
		RegionalCode: strings.TrimSpace(ctx.Query("regional")),
		OnlyTarget:   onlyTarget,
		Limit:        limit,
		Offset:       offset,
	}
	rows, err := controller.service.ListReceivedSummary(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]sentSummaryItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, sentSummaryItem{
			OfficeCode: row.OfficeCode, OfficeName: row.OfficeName,
			Total: row.Total, Completed: row.Completed, CompletedPct: reportPercentage(row.Completed, row.Total),
			Open: row.Open, OpenPct: reportPercentage(row.Open, row.Total),
			Responded: row.Responded, RespondedPct: reportPercentage(row.Responded, row.Total),
			Unresponded: row.Unresponded, UnrespondedPct: reportPercentage(row.Unresponded, row.Total),
		})
	}
	return ctx.JSON(sentSummaryResponse{Data: items, Pagination: paginationResult{Limit: limit, Offset: offset}})
}

func (controller *Controller) ListBreakdown(ctx fiber.Ctx, direction complaints.BreakdownDirection, kind complaints.BreakdownKind) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	page, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	onlyTarget := false
	switch strings.ToLower(strings.TrimSpace(ctx.Query("hanya_tujuan"))) {
	case "on", "1", "true":
		onlyTarget = true
	}
	rows, err := controller.service.ListBreakdown(ctx.Context(), identity, complaints.BreakdownQuery{
		Direction:    direction,
		Kind:         kind,
		From:         from,
		To:           to,
		ProductCode:  strings.TrimSpace(ctx.Query("product_code")),
		RegionalCode: strings.TrimSpace(ctx.Query("regional")),
		OfficeCode:   strings.TrimSpace(ctx.Query("office")),
		OnlyTarget:   onlyTarget,
		Limit:        page.Limit,
		Offset:       page.Offset,
	})
	if err != nil {
		return controllerError(err)
	}
	items := make([]breakdownItem, 0, len(rows))
	var total int64
	for _, row := range rows {
		items = append(items, breakdownItem{Code: row.Code, Label: row.Label, Count: row.Count})
		total += row.Count
	}
	for index := range items {
		items[index].Percent = reportPercentage(items[index].Count, total)
	}
	return ctx.JSON(breakdownResponse{Data: items, Total: total, Percent: reportPercentage(total, total)})
}

func (controller *Controller) ListBreakdownDetail(ctx fiber.Ctx, direction complaints.BreakdownDirection, kind complaints.BreakdownKind) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	page, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	onlyTarget := false
	switch strings.ToLower(strings.TrimSpace(ctx.Query("hanya_tujuan"))) {
	case "on", "1", "true":
		onlyTarget = true
	}
	rows, err := controller.service.ListBreakdownDetail(ctx.Context(), identity, complaints.BreakdownDetailQuery{
		Direction:    direction,
		Kind:         kind,
		Code:         strings.TrimSpace(ctx.Query("code")),
		From:         from,
		To:           to,
		RegionalCode: strings.TrimSpace(ctx.Query("regional")),
		OfficeCode:   strings.TrimSpace(ctx.Query("office")),
		OnlyTarget:   onlyTarget,
		Limit:        page.Limit,
		Offset:       page.Offset,
	})
	if err != nil {
		return controllerError(err)
	}
	items := make([]receivedOpenReportItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, receivedOpenReportItem{
			ComplaintID:                   row.ComplaintID,
			TargetOfficeUpdateCode:        row.TargetOfficeUpdateCode,
			OriginOfficeUpdateCode:        row.OriginOfficeUpdateCode,
			ShipmentNumber:                row.ShipmentNumber,
			ShipmentTypeCode:              row.ShipmentTypeCode,
			ComplaintCreatedAt:            row.ComplaintCreatedAt.UTC().Format(responseTimestampLayout),
			ShipmentDestinationOfficeCode: row.ShipmentDestinationOfficeCode,
			LatestStatusCode:              row.LatestStatusCode,
			LatestStatusDescription:       row.LatestStatusDescription,
			LatestStatusOfficeCode:        row.LatestStatusOfficeCode,
			LatestStatusAt:                row.LatestStatusAt.UTC().Format(responseTimestampLayout),
			DurationSeconds:               row.DurationSeconds,
		})
	}
	return ctx.JSON(receivedOpenReportResponse{Data: items, Pagination: paginationResult{Limit: page.Limit, Offset: page.Offset}})
}

func (controller *Controller) CountReceivedOpenDurationBuckets(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	buckets, err := controller.service.CountReceivedOpenDurationBuckets(ctx.Context(), identity, complaints.ReceivedOpenDurationQuery{
		From: from, To: to, ProductCode: strings.TrimSpace(ctx.Query("product_code")),
	})
	if err != nil {
		return controllerError(err)
	}
	total := buckets.Total()
	return ctx.JSON(receivedOpenDurationResponse{
		DayZero: buckets.DayZero, DayZeroPercent: reportPercentage(buckets.DayZero, total),
		DayOne: buckets.DayOne, DayOnePercent: reportPercentage(buckets.DayOne, total),
		DayTwo: buckets.DayTwo, DayTwoPercent: reportPercentage(buckets.DayTwo, total),
		DayThree: buckets.DayThree, DayThreePercent: reportPercentage(buckets.DayThree, total),
		DayFourPlus: buckets.DayFourPlus, DayFourPlusPercent: reportPercentage(buckets.DayFourPlus, total), Total: total,
	})
}

func (controller *Controller) CountSentOpenDurationBuckets(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	buckets, err := controller.service.CountSentOpenDurationBuckets(ctx.Context(), identity, complaints.SentOpenDurationQuery{
		From: from, To: to, ProductCode: strings.TrimSpace(ctx.Query("product_code")),
	})
	if err != nil {
		return controllerError(err)
	}
	total := buckets.Total()
	return ctx.JSON(receivedOpenDurationResponse{
		DayZero: buckets.DayZero, DayZeroPercent: reportPercentage(buckets.DayZero, total),
		DayOne: buckets.DayOne, DayOnePercent: reportPercentage(buckets.DayOne, total),
		DayTwo: buckets.DayTwo, DayTwoPercent: reportPercentage(buckets.DayTwo, total),
		DayThree: buckets.DayThree, DayThreePercent: reportPercentage(buckets.DayThree, total),
		DayFourPlus: buckets.DayFourPlus, DayFourPlusPercent: reportPercentage(buckets.DayFourPlus, total), Total: total,
	})
}

type durationSummaryItem struct {
	OfficeCode     string  `json:"office_code"`
	OfficeName     string  `json:"office_name"`
	Total          int64   `json:"total"`
	DayZero        int64   `json:"day_zero"`
	DayZeroPct     float64 `json:"day_zero_pct"`
	DayOne         int64   `json:"day_one"`
	DayOnePct      float64 `json:"day_one_pct"`
	DayTwo         int64   `json:"day_two"`
	DayTwoPct      float64 `json:"day_two_pct"`
	DayThree       int64   `json:"day_three"`
	DayThreePct    float64 `json:"day_three_pct"`
	DayFourPlus    int64   `json:"day_four_plus"`
	DayFourPlusPct float64 `json:"day_four_plus_pct"`
}

type durationSummaryResponse struct {
	Data    []durationSummaryItem `json:"data"`
	Summary durationSummaryItem   `json:"summary"`
}

type durationDetailItem struct {
	ComplaintID        string `json:"complaint_id"`
	ComplaintType      string `json:"complaint_type"`
	ShipmentNumber     string `json:"shipment_number"`
	ProductCode        string `json:"product_code"`
	Summary            string `json:"summary"`
	SourceOfficeCode   string `json:"source_office_code"`
	TargetOfficeCode   string `json:"target_office_code"`
	FinalStatusCode    string `json:"final_status_code"`
	LatestStatusCode   string `json:"latest_status_code"`
	LatestStatusOffice string `json:"latest_status_office"`
	LatestStatusAt     string `json:"latest_status_at"`
	CreatedAt          string `json:"created_at"`
	DurationDays       int    `json:"duration_days"`
}

func (controller *Controller) ListDurationSummary(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	limit, offset, err := parsePaginationCustom(ctx, 500)
	if err != nil {
		return fiber.ErrBadRequest
	}
	query := complaints.DurationSummaryQuery{
		Direction:    strings.TrimSpace(ctx.Query("direction")),
		Status:       strings.TrimSpace(ctx.Query("status")),
		From:         from,
		To:           to,
		ProductCode:  strings.TrimSpace(ctx.Query("product_code")),
		RegionalCode: strings.TrimSpace(ctx.Query("regional")),
		Limit:        limit,
		Offset:       offset,
	}
	rows, err := controller.service.ListDurationSummary(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}

	items := make([]durationSummaryItem, 0, len(rows))
	var sumTotal, sumZero, sumOne, sumTwo, sumThree, sumFour int64
	for _, row := range rows {
		sumTotal += row.Total
		sumZero += row.DayZero
		sumOne += row.DayOne
		sumTwo += row.DayTwo
		sumThree += row.DayThree
		sumFour += row.DayFourPlus

		items = append(items, durationSummaryItem{
			OfficeCode:     row.OfficeCode,
			OfficeName:     row.OfficeName,
			Total:          row.Total,
			DayZero:        row.DayZero,
			DayZeroPct:     reportPercentage(row.DayZero, row.Total),
			DayOne:         row.DayOne,
			DayOnePct:      reportPercentage(row.DayOne, row.Total),
			DayTwo:         row.DayTwo,
			DayTwoPct:      reportPercentage(row.DayTwo, row.Total),
			DayThree:       row.DayThree,
			DayThreePct:    reportPercentage(row.DayThree, row.Total),
			DayFourPlus:    row.DayFourPlus,
			DayFourPlusPct: reportPercentage(row.DayFourPlus, row.Total),
		})
	}
	summary := durationSummaryItem{
		OfficeCode:     "TOTAL",
		OfficeName:     "Total Seluruh Kantor",
		Total:          sumTotal,
		DayZero:        sumZero,
		DayZeroPct:     reportPercentage(sumZero, sumTotal),
		DayOne:         sumOne,
		DayOnePct:      reportPercentage(sumOne, sumTotal),
		DayTwo:         sumTwo,
		DayTwoPct:      reportPercentage(sumTwo, sumTotal),
		DayThree:       sumThree,
		DayThreePct:    reportPercentage(sumThree, sumTotal),
		DayFourPlus:    sumFour,
		DayFourPlusPct: reportPercentage(sumFour, sumTotal),
	}
	return ctx.JSON(durationSummaryResponse{
		Data:    items,
		Summary: summary,
	})
}

func (controller *Controller) ListDurationDetail(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil || from == nil || to == nil {
		return fiber.ErrBadRequest
	}
	limit, offset, err := parsePaginationCustom(ctx, 200)
	if err != nil {
		return fiber.ErrBadRequest
	}
	query := complaints.DurationDetailQuery{
		Direction:      strings.TrimSpace(ctx.Query("direction")),
		Status:         strings.TrimSpace(ctx.Query("status")),
		OfficeCode:     strings.TrimSpace(ctx.Query("office_code")),
		DurationBucket: strings.TrimSpace(ctx.Query("duration_bucket")),
		From:           from,
		To:             to,
		ProductCode:    strings.TrimSpace(ctx.Query("product_code")),
		Limit:          limit,
		Offset:         offset,
	}
	rows, err := controller.service.ListDurationDetail(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}

	items := make([]durationDetailItem, 0, len(rows))
	for _, row := range rows {
		latestAt := ""
		if !row.LatestStatusAt.IsZero() {
			latestAt = row.LatestStatusAt.UTC().Format(responseTimestampLayout)
		}
		createdAt := ""
		if !row.CreatedAt.IsZero() {
			createdAt = row.CreatedAt.UTC().Format(responseTimestampLayout)
		}
		items = append(items, durationDetailItem{
			ComplaintID:        row.ComplaintID,
			ComplaintType:      row.ComplaintType,
			ShipmentNumber:     row.ShipmentNumber,
			ProductCode:        row.ProductCode,
			Summary:            row.Summary,
			SourceOfficeCode:   row.SourceOfficeCode,
			TargetOfficeCode:   row.TargetOfficeCode,
			FinalStatusCode:    row.FinalStatusCode,
			LatestStatusCode:   row.LatestStatusCode,
			LatestStatusOffice: row.LatestStatusOffice,
			LatestStatusAt:     latestAt,
			CreatedAt:          createdAt,
			DurationDays:       row.DurationDays,
		})
	}
	return ctx.JSON(fiber.Map{
		"data": items,
		"pagination": paginationResult{
			Limit:  limit,
			Offset: offset,
		},
	})
}

func (controller *Controller) ListStatusComplaints(ctx fiber.Ctx) error {
	direction := strings.TrimSpace(ctx.Query("direction"))
	statusCat := strings.TrimSpace(ctx.Query("status"))
	return controller.listStatusComplaintsWithParams(ctx, direction, statusCat)
}

func (controller *Controller) listStatusComplaintsWithParams(ctx fiber.Ctx, defaultDirection, defaultStatus string) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	limit, offset, err := parsePaginationCustom(ctx, 200)
	if err != nil {
		return fiber.ErrBadRequest
	}

	direction := strings.TrimSpace(ctx.Query("direction"))
	if direction == "" {
		direction = defaultDirection
	}
	status := strings.TrimSpace(ctx.Query("status"))
	if status == "" {
		status = defaultStatus
	}

	query := complaints.StatusListQuery{
		Direction:      direction,
		StatusCategory: status,
		From:           from,
		To:             to,
		RegionalCode:   strings.TrimSpace(ctx.Query("regional")),
		OfficeCode:     strings.TrimSpace(ctx.Query("office_code")),
		ProductCode:    strings.TrimSpace(ctx.Query("product_code")),
		ComplaintType:  strings.TrimSpace(ctx.Query("complaint_type")),
		Search:         strings.TrimSpace(ctx.Query("search")),
		Limit:          limit,
		Offset:         offset,
	}

	result, err := controller.service.ListStatusComplaints(ctx.Context(), identity, query)
	if err != nil {
		fmt.Printf("[StatusComplaints Error] %v\n", err)
		return controllerError(err)
	}

	type statusItemResponse struct {
		ID                    string  `json:"id"`
		OriginOfficeCode      string  `json:"origin_office_code"`
		OriginOfficeName      string  `json:"origin_office_name"`
		DestinationOfficeCode string  `json:"destination_office_code"`
		DestinationOfficeName string  `json:"destination_office_name"`
		CopyOfficeCodes       string  `json:"copy_office_codes"`
		ComplaintTypeCode     string  `json:"complaint_type_code"`
		ComplaintTypeName     string  `json:"complaint_type_name"`
		ShipmentTypeCode      string  `json:"shipment_type_code"`
		ShipmentTypeName      string  `json:"shipment_type_name"`
		ShipmentNumber        string  `json:"shipment_number"`
		FinalStatusCode       string  `json:"final_status_code"`
		FinalStatusName       string  `json:"final_status_name"`
		StatusDate            *string `json:"status_date"`
		StatusOfficeCode      string  `json:"status_office_code"`
		StatusOfficeName      string  `json:"status_office_name"`
		TargetUpdateOffice    string  `json:"target_update_office"`
		Summary               string  `json:"summary"`
		ComplaintDate         *string `json:"complaint_date"`
		DurationDays          int     `json:"duration_days"`
	}

	items := make([]statusItemResponse, 0, len(result.Items))
	for _, it := range result.Items {
		var statusAt *string
		if it.StatusDate != nil {
			formatted := it.StatusDate.UTC().Format(responseTimestampLayout)
			statusAt = &formatted
		}
		var complaintAt *string
		if it.ComplaintDate != nil {
			formatted := it.ComplaintDate.UTC().Format(responseTimestampLayout)
			complaintAt = &formatted
		}
		items = append(items, statusItemResponse{
			ID:                    it.ComplaintID,
			OriginOfficeCode:      it.OriginOfficeCode,
			OriginOfficeName:      it.OriginOfficeName,
			DestinationOfficeCode: it.DestinationOfficeCode,
			DestinationOfficeName: it.DestinationOfficeName,
			CopyOfficeCodes:       it.CopyOfficeCodes,
			ComplaintTypeCode:     it.ComplaintTypeCode,
			ComplaintTypeName:     it.ComplaintTypeName,
			ShipmentTypeCode:      it.ShipmentTypeCode,
			ShipmentTypeName:      it.ShipmentTypeName,
			ShipmentNumber:        it.ShipmentNumber,
			FinalStatusCode:       it.FinalStatusCode,
			FinalStatusName:       it.FinalStatusName,
			StatusDate:            statusAt,
			StatusOfficeCode:      it.StatusOfficeCode,
			StatusOfficeName:      it.StatusOfficeName,
			TargetUpdateOffice:    it.TargetUpdateOffice,
			Summary:               it.Summary,
			ComplaintDate:         complaintAt,
			DurationDays:          it.DurationDays,
		})
	}

	return ctx.JSON(fiber.Map{
		"data":   items,
		"total":  result.TotalCount,
		"counts": result.Counts,
		"pagination": fiber.Map{
			"limit":  limit,
			"offset": offset,
			"total":  result.TotalCount,
		},
	})
}

func reportPercentage(count int64, total int64) float64 {
	if total == 0 {
		return 0
	}
	return math.Round(float64(count)*10000/float64(total)) / 100
}

func (controller *Controller) listDashboardOpen(ctx fiber.Ctx, list func(context.Context, authentication.VerifiedIdentity, complaints.ComplaintListQuery) ([]complaints.ComplaintSummary, error)) error {
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	query.From, query.To, err = parseCompletedCountDates(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	results, err := list(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]complaintItem, 0, len(results))
	for _, result := range results {
		items = append(items, mapComplaintItem(result))
	}
	return ctx.JSON(listResponse{Data: items, Pagination: paginationResult{Limit: query.Limit, Offset: query.Offset}})
}

func (controller *Controller) countDashboard(ctx fiber.Ctx, count func(context.Context, authentication.VerifiedIdentity, complaints.CompletedCountQuery) (int64, error)) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	from, to, err := parseCompletedCountDates(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	value, err := count(ctx.Context(), identity, complaints.CompletedCountQuery{From: from, To: to})
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(completedCountResponse{Count: value})
}

func parseCompletedCountDates(ctx fiber.Ctx) (*time.Time, *time.Time, error) {
	fromValue := strings.TrimSpace(ctx.Query("from"))
	toValue := strings.TrimSpace(ctx.Query("to"))
	if fromValue == "" && toValue == "" {
		return nil, nil, nil
	}
	from, err := time.Parse("2006-01-02", fromValue)
	if err != nil {
		return nil, nil, err
	}
	to, err := time.Parse("2006-01-02", toValue)
	if err != nil {
		return nil, nil, err
	}
	to = to.Add(24*time.Hour - time.Nanosecond)
	return &from, &to, nil
}

func (controller *Controller) ListOpenForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}

	complaintSummaries, err := controller.service.ListOpenForCallCenter(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]complaintItem, 0, len(complaintSummaries))
	for _, summary := range complaintSummaries {
		items = append(items, mapComplaintItem(summary))
	}
	return ctx.JSON(listResponse{
		Data: items,
		Pagination: paginationResult{
			Limit:  query.Limit,
			Offset: query.Offset,
		},
	})
}

func (controller *Controller) ExportOpenForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	results, err := controller.service.ExportOpenForCallCenter(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	var output bytes.Buffer
	writer := csv.NewWriter(&output)
	if err := writer.Write([]string{"id", "origin_office_code", "destination_office_code", "copy_office_codes", "all_target_office_codes", "shipment_number", "complaint_date", "summary", "status_code", "status_date", "status_office_code"}); err != nil {
		return fiber.ErrInternalServerError
	}
	for _, complaint := range results {
		complaintDate := ""
		if complaint.ComplaintDate != nil {
			complaintDate = complaint.ComplaintDate.UTC().Format(responseTimestampLayout)
		}
		statusDate := ""
		if !complaint.StatusDate.IsZero() {
			statusDate = complaint.StatusDate.UTC().Format(responseTimestampLayout)
		}
		if err := writer.Write([]string{
			spreadsheetSafeCell(complaint.ComplaintID),
			spreadsheetSafeCell(complaint.OriginOfficeCode),
			spreadsheetSafeCell(complaint.DestinationOfficeCode),
			spreadsheetSafeCell(complaint.CopyOfficeCodes),
			spreadsheetSafeCell(complaint.AllTargetOfficeCodes),
			spreadsheetSafeCell(complaint.ShipmentNumber),
			complaintDate,
			spreadsheetSafeCell(complaint.Summary),
			spreadsheetSafeCell(complaint.StatusCode),
			statusDate,
			spreadsheetSafeCell(complaint.StatusOfficeCode),
		}); err != nil {
			return fiber.ErrInternalServerError
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return fiber.ErrInternalServerError
	}
	ctx.Set("Content-Type", "text/csv; charset=utf-8")
	ctx.Set("Content-Disposition", `attachment; filename="cch-open-complaints.csv"`)
	return ctx.SendString(output.String())
}

func spreadsheetSafeCell(value string) string {
	trimmed := strings.TrimLeft(value, " \t\r\n")
	if value != "" && (strings.ContainsRune("\t\r\n", rune(value[0])) ||
		(len(trimmed) > 0 && strings.ContainsRune("=+-@", rune(trimmed[0])))) {
		return "'" + value
	}
	return value
}

func (controller *Controller) ListOpenTicketHistoryForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	pagination, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	query, err := (complaints.ComplaintHistoryQuery{
		ComplaintID: ctx.Params("id"),
		Limit:       pagination.Limit,
		Offset:      pagination.Offset,
	}).NormalizeRequest()
	if err != nil {
		return fiber.ErrBadRequest
	}
	entries, err := controller.service.ListOpenTicketHistoryForCallCenter(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]historyItem, 0, len(entries))
	for _, entry := range entries {
		items = append(items, historyItem{
			ComplaintID:       entry.ComplaintID,
			HistoryID:         entry.HistoryID,
			StatusCode:        entry.StatusCode,
			StatusDescription: entry.StatusDescription,
			OriginOfficeCode:  entry.OriginOfficeCode,
			Description:       entry.Description,
			UpdatedAt:         entry.UpdatedAt.UTC().Format(responseTimestampLayout),
			UpdatedBy:         entry.UpdatedBy,
			DurationSeconds:   entry.DurationSeconds,
		})
	}
	return ctx.JSON(historyResponse{
		Data: items,
		Pagination: paginationResult{
			Limit:  query.Limit,
			Offset: query.Offset,
		},
	})
}

func (controller *Controller) ListCompletedTicketHistoryForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	pagination, err := parsePagination(ctx)
	if err != nil {
		return fiber.ErrBadRequest
	}
	query, err := (complaints.ComplaintHistoryQuery{ComplaintID: ctx.Params("id"), Limit: pagination.Limit, Offset: pagination.Offset}).NormalizeRequest()
	if err != nil {
		return fiber.ErrBadRequest
	}
	entries, err := controller.service.ListCompletedTicketHistoryForCallCenter(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}
	items := make([]historyItem, 0, len(entries))
	for _, entry := range entries {
		items = append(items, historyItem{ComplaintID: entry.ComplaintID, HistoryID: entry.HistoryID, StatusCode: entry.StatusCode, StatusDescription: entry.StatusDescription, OriginOfficeCode: entry.OriginOfficeCode, Description: entry.Description, UpdatedAt: entry.UpdatedAt.UTC().Format(responseTimestampLayout), UpdatedBy: entry.UpdatedBy, DurationSeconds: entry.DurationSeconds})
	}
	return ctx.JSON(historyResponse{Data: items, Pagination: paginationResult{Limit: query.Limit, Offset: query.Offset}})
}

func (controller *Controller) GetOpenForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := (complaints.ComplaintDetailQuery{ComplaintID: ctx.Params("id")}).NormalizeRequest()
	if err != nil {
		return fiber.ErrBadRequest
	}
	detail, err := controller.service.GetOpenForCallCenter(ctx.Context(), identity, query.ComplaintID)
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(detailResponse{Data: mapComplaintDetail(detail)})
}

func (controller *Controller) GetCompletedForCallCenter(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := (complaints.ComplaintDetailQuery{ComplaintID: ctx.Params("id")}).NormalizeRequest()
	if err != nil {
		return fiber.ErrBadRequest
	}
	detail, err := controller.service.GetCompletedForCallCenter(ctx.Context(), identity, query.ComplaintID)
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(detailResponse{Data: mapComplaintDetail(detail)})
}

func (controller *Controller) ListCallCenterStatusOptions(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "no-store")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := (complaints.ComplaintDetailQuery{ComplaintID: ctx.Params("id")}).NormalizeRequest()
	if err != nil {
		return fiber.ErrBadRequest
	}
	options, err := controller.service.ListCallCenterStatusOptions(ctx.Context(), identity, query.ComplaintID)
	if errors.Is(err, complaints.ErrCallCenterRoleRequired) {
		options, err = controller.service.ListStatusOptions(ctx.Context(), identity, query.ComplaintID)
	}
	if err != nil {
		return controllerError(err)
	}
	items := make([]statusOptionItem, 0, len(options))
	for _, option := range options {
		items = append(items, statusOptionItem{Code: option.Code, Description: option.Description})
	}
	return ctx.JSON(statusOptionsResponse{Data: items})
}

func (controller *Controller) ListStatusOptions(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "no-store")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	query, err := (complaints.ComplaintDetailQuery{ComplaintID: ctx.Params("id")}).NormalizeRequest()
	if err != nil {
		return fiber.ErrBadRequest
	}
	options, err := controller.service.ListStatusOptions(ctx.Context(), identity, query.ComplaintID)
	if err != nil {
		return controllerError(err)
	}
	items := make([]statusOptionItem, 0, len(options))
	for _, option := range options {
		items = append(items, statusOptionItem{Code: option.Code, Description: option.Description})
	}
	return ctx.JSON(statusOptionsResponse{Data: items})
}

func parsePagination(ctx fiber.Ctx) (complaints.ComplaintListQuery, error) {
	query := complaints.ComplaintListQuery{}
	if rawLimit := strings.TrimSpace(ctx.Query("limit")); rawLimit != "" {
		limit, err := strconv.Atoi(rawLimit)
		if err != nil {
			return complaints.ComplaintListQuery{}, complaints.ErrInvalidComplaintListQuery
		}
		query.Limit = limit
	}
	if rawOffset := strings.TrimSpace(ctx.Query("offset")); rawOffset != "" {
		offset, err := strconv.Atoi(rawOffset)
		if err != nil {
			return complaints.ComplaintListQuery{}, complaints.ErrInvalidComplaintListQuery
		}
		query.Offset = offset
	}
	return query.NormalizePagination()
}

func parsePaginationCustom(ctx fiber.Ctx, maxLimit int) (int, int, error) {
	limit := 50
	if rawLimit := strings.TrimSpace(ctx.Query("limit")); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed < 1 || (maxLimit > 0 && parsed > maxLimit) {
			return 0, 0, complaints.ErrInvalidComplaintListQuery
		}
		limit = parsed
	}
	offset := 0
	if rawOffset := strings.TrimSpace(ctx.Query("offset")); rawOffset != "" {
		parsed, err := strconv.Atoi(rawOffset)
		if err != nil || parsed < 0 {
			return 0, 0, complaints.ErrInvalidComplaintListQuery
		}
		offset = parsed
	}
	return limit, offset, nil
}

func mapComplaintItem(summary complaints.ComplaintSummary) complaintItem {
	var complaintDate any
	if summary.ComplaintDate != nil {
		complaintDate = summary.ComplaintDate.UTC().Format(responseTimestampLayout)
	}
	return complaintItem{
		ID:                    summary.ComplaintID,
		OriginOfficeCode:      summary.OriginOfficeCode,
		DestinationOfficeCode: summary.DestinationOfficeCode,
		CopyOfficeCodes:       summary.CopyOfficeCodes,
		AllTargetOfficeCodes:  summary.AllTargetOfficeCodes,
		ShipmentNumber:        summary.ShipmentNumber,
		ComplaintDate:         complaintDate,
		Summary:               summary.Summary,
		StatusCode:            summary.StatusCode,
		StatusDate:            summary.StatusDate.UTC().Format(responseTimestampLayout),
		StatusOfficeCode:      summary.StatusOfficeCode,
	}
}

func mapComplaintDetail(detail complaints.ComplaintDetail) detailItem {
	var complaintDate *string
	if detail.ComplaintDate != nil {
		formatted := detail.ComplaintDate.UTC().Format(responseTimestampLayout)
		complaintDate = &formatted
	}
	return detailItem{
		ID:                    detail.ComplaintID,
		CustomerName:          detail.CustomerName,
		CustomerEmail:         detail.CustomerEmail,
		CustomerPhone:         detail.CustomerPhone,
		CustomerAddress:       detail.CustomerAddress,
		OriginOfficeCode:      detail.OriginOfficeCode,
		DestinationOfficeCode: detail.DestinationOfficeCode,
		CopyOfficeCodes:       detail.CopyOfficeCodes,
		AllTargetOfficeCodes:  detail.AllTargetOfficeCodes,
		ComplaintTypeCode:     detail.ComplaintTypeCode,
		ComplaintSourceCode:   detail.ComplaintSourceCode,
		ShipmentTypeCode:      detail.ShipmentTypeCode,
		ShipmentNumber:        detail.ShipmentNumber,
		ComplaintDate:         complaintDate,
		ShipmentOriginOffice:  detail.ShipmentOriginOffice,
		ShipmentTargetOffice:  detail.ShipmentTargetOffice,
		Summary:               detail.Summary,
		Description:           detail.Description,
		StatusCode:            detail.StatusCode,
		StatusDescription:     detail.StatusDescription,
		StatusDate:            detail.StatusDate.UTC().Format(responseTimestampLayout),
		StatusOfficeCode:      detail.StatusOfficeCode,
		RequestStatus:         detail.RequestStatus,
	}
}

func controllerError(err error) error {
	switch {
	case errors.Is(err, complaints.ErrInvalidComplaintListQuery),
		errors.Is(err, complaints.ErrInvalidComplaintHistoryQuery),
		errors.Is(err, complaints.ErrInvalidComplaintDetailQuery):
		return fiber.ErrBadRequest
	case errors.Is(err, complaints.ErrComplaintNotFoundOrNotVisible), errors.Is(err, complaints.ErrStatusOptionsNotAvailable):
		return fiber.ErrNotFound
	case errors.Is(err, complaints.ErrCallCenterRoleRequired),
		errors.Is(err, complaints.ErrDashboardRoleRequired),
		errors.Is(err, authorization.ErrSystemAdministratorUnsupported),
		errors.Is(err, authorization.ErrInvalidUserLevels),
		errors.Is(err, authorization.ErrPermissionDenied):
		return fiber.ErrForbidden
	default:
		return httpapi.AuthorizationHTTPError(err)
	}
}
