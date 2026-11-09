package controller

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/gagalxray"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type Service interface {
	List(ctx context.Context, identity authentication.VerifiedIdentity, query gagalxray.ListQuery) (gagalxray.Page, error)
	Get(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) (gagalxray.KirimanGagalXray, error)
	Create(ctx context.Context, identity authentication.VerifiedIdentity, cmd gagalxray.CreateCommand) (gagalxray.KirimanGagalXray, error)
	Update(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string, cmd gagalxray.UpdateCommand) (gagalxray.KirimanGagalXray, error)
	Delete(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) error
	Stats(ctx context.Context, identity authentication.VerifiedIdentity) (gagalxray.Stats, error)
}

type Controller struct {
	service Service
}

func New(service Service) *Controller {
	return &Controller{service: service}
}

func (c *Controller) Register(router fiber.Router) {
	router.Get("/gagal-xray", c.List)
	router.Get("/gagal-xray/stats", c.Stats)
	router.Get("/gagal-xray/:asal/:tujuan/:id/:kantong", c.Get)
	router.Post("/gagal-xray", c.Create)
	router.Put("/gagal-xray/:asal/:tujuan/:id/:kantong", c.Update)
	router.Delete("/gagal-xray/:asal/:tujuan/:id/:kantong", c.Delete)
}

func (c *Controller) List(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	query := gagalxray.ListQuery{
		Search:            strings.TrimSpace(ctx.Query("q")),
		KantorAsal:        strings.TrimSpace(ctx.Query("kantor_asal")),
		KantorTujuan:      strings.TrimSpace(ctx.Query("kantor_tujuan")),
		KantorPenerbangan: strings.TrimSpace(ctx.Query("kantor_penerbangan")),
		Keterangan:        strings.TrimSpace(ctx.Query("keterangan")),
		StartDate:         strings.TrimSpace(ctx.Query("start_date")),
		EndDate:           strings.TrimSpace(ctx.Query("end_date")),
	}
	if query.Search == "" {
		query.Search = strings.TrimSpace(ctx.Query("search"))
	}

	if raw := strings.TrimSpace(ctx.Query("limit")); raw != "" {
		if limit, err := strconv.Atoi(raw); err == nil {
			query.Limit = limit
		} else {
			return fiber.ErrBadRequest
		}
	}
	if raw := strings.TrimSpace(ctx.Query("offset")); raw != "" {
		if offset, err := strconv.Atoi(raw); err == nil {
			query.Offset = offset
		} else {
			return fiber.ErrBadRequest
		}
	}

	page, err := c.service.List(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(page)
}

func (c *Controller) Stats(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	stats, err := c.service.Stats(ctx.Context(), identity)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(stats)
}

func (c *Controller) Get(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	asal := ctx.Params("asal")
	tujuan := ctx.Params("tujuan")
	id := ctx.Params("id")
	kantong := ctx.Params("kantong")

	item, err := c.service.Get(ctx.Context(), identity, asal, tujuan, id, kantong)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(item)
}

func (c *Controller) Create(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	var cmd gagalxray.CreateCommand
	if err := ctx.Bind().Body(&cmd); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	created, err := c.service.Create(ctx.Context(), identity, cmd)
	if err != nil {
		return controllerError(err)
	}

	return ctx.Status(fiber.StatusCreated).JSON(created)
}

func (c *Controller) Update(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	asal := ctx.Params("asal")
	tujuan := ctx.Params("tujuan")
	id := ctx.Params("id")
	kantong := ctx.Params("kantong")

	var cmd gagalxray.UpdateCommand
	if err := ctx.Bind().Body(&cmd); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	updated, err := c.service.Update(ctx.Context(), identity, asal, tujuan, id, kantong, cmd)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(updated)
}

func (c *Controller) Delete(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	asal := ctx.Params("asal")
	tujuan := ctx.Params("tujuan")
	id := ctx.Params("id")
	kantong := ctx.Params("kantong")

	if err := c.service.Delete(ctx.Context(), identity, asal, tujuan, id, kantong); err != nil {
		return controllerError(err)
	}

	return ctx.JSON(fiber.Map{
		"message": "kiriman gagal xray deleted successfully",
	})
}

func (c *Controller) identity(ctx fiber.Ctx) (authentication.VerifiedIdentity, error) {
	if c == nil || c.service == nil {
		return authentication.VerifiedIdentity{}, fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return authentication.VerifiedIdentity{}, fiber.ErrUnauthorized
	}
	return identity, nil
}

func controllerError(err error) error {
	switch {
	case errors.Is(err, gagalxray.ErrNotFound):
		return fiber.NewError(fiber.StatusNotFound, "kiriman gagal xray not found")
	case errors.Is(err, gagalxray.ErrAlreadyExists):
		return fiber.NewError(fiber.StatusConflict, "kiriman gagal xray already exists with this composite key")
	case errors.Is(err, gagalxray.ErrInvalidInput),
		errors.Is(err, gagalxray.ErrCompositeKeyRequired):
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	case errors.Is(err, gagalxray.ErrGagalXrayNotConfigured):
		return fiber.ErrServiceUnavailable
	default:
		return httpapi.AuthorizationHTTPError(err)
	}
}
