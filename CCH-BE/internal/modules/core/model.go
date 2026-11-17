package core

type SearchResultItem struct {
	TicketID       string `json:"ticket_id"`
	ShipmentNumber string `json:"shipment_number"`
	CustomerName   string `json:"customer_name"`
	CustomerPhone  string `json:"customer_phone"`
	OriginOffice   string `json:"origin_office"`
	TargetOffice   string `json:"target_office"`
	Summary        string `json:"summary"`
	StatusCode     string `json:"status_code"`
	StatusName     string `json:"status_name"`
	IsCompleted    bool   `json:"is_completed"`
	CreatedAt      string `json:"created_at"`
	UrgencyLevel   string `json:"urgency_level"`
	Sentiment      string `json:"sentiment"`
	IsAICreated    bool   `json:"is_ai_created"`
	DetailURL      string `json:"detail_url"`
}

type SearchResponse struct {
	Query     string             `json:"query"`
	Total     int                `json:"total"`
	ElapsedMs int64              `json:"elapsed_ms"`
	Results   []SearchResultItem `json:"results"`
}

type NotificationItem struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Category  string `json:"category"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
	TimeAgo   string `json:"time_ago"`
	Urgency   string `json:"urgency"`
	Link      string `json:"link"`
	IsRead    bool   `json:"is_read"`
}

type NotificationResponse struct {
	UnreadCount int                `json:"unread_count"`
	TotalCount  int                `json:"total_count"`
	Items       []NotificationItem `json:"items"`
	UpdatedAt   string             `json:"updated_at"`
}

type MarkReadResponse struct {
	Success     bool `json:"success"`
	MarkedCount int  `json:"marked_count"`
}

