package database

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
)

// CoworkJobDTO is the API/transport shape for Job Cowork records.
type CoworkJobDTO struct {
	JobID          string            `json:"job_id"`
	Title          string            `json:"title"`
	TargetURL      string            `json:"target_url"`
	HostKey        string            `json:"host_key"`
	Scope          string            `json:"scope"`
	AutonomyLevel  string            `json:"autonomy_level"`
	Status         string            `json:"status"`
	ScanID         string            `json:"scan_id,omitempty"`
	RepoPath       string            `json:"repo_path,omitempty"`
	DefenseDeltas  map[string]int    `json:"defense_deltas"`
	Residuals      []string          `json:"residuals"`
	AntibodyLoopOK *bool             `json:"antibody_loop_ok"`
	FindingsCount  int               `json:"findings_count"`
	MitigatedCount int               `json:"mitigated_count"`
	LiveChecksRun  int               `json:"live_checks_run"`
	ArtifactPaths  map[string]string `json:"artifact_paths,omitempty"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
}

func UpsertCoworkJob(dto CoworkJobDTO, stepLogs []models.CoworkJobStepLog, approvals []models.CoworkJobApproval) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	if dto.JobID == "" {
		return fmt.Errorf("job_id required")
	}

	defenseJSON, _ := json.Marshal(dto.DefenseDeltas)
	residualJSON, _ := json.Marshal(dto.Residuals)

	record := models.CoworkJob{
		JobID:          dto.JobID,
		Title:          dto.Title,
		TargetURL:      dto.TargetURL,
		HostKey:        dto.HostKey,
		Scope:          dto.Scope,
		AutonomyLevel:  dto.AutonomyLevel,
		Status:         dto.Status,
		ScanID:         dto.ScanID,
		RepoPath:       dto.RepoPath,
		DefenseDeltas:  string(defenseJSON),
		Residuals:      string(residualJSON),
		AntibodyLoopOK: dto.AntibodyLoopOK,
		FindingsCount:  dto.FindingsCount,
		MitigatedCount: dto.MitigatedCount,
		LiveChecksRun:  dto.LiveChecksRun,
	}

	var existing models.CoworkJob
	err := DB.Where("job_id = ?", dto.JobID).First(&existing).Error
	if err != nil {
		record.Base = models.Base{ID: uuid.New()}
		if err := DB.Create(&record).Error; err != nil {
			return err
		}
	} else {
		record.ID = existing.ID
		record.CreatedAt = existing.CreatedAt
		if err := DB.Save(&record).Error; err != nil {
			return err
		}
	}

	if len(stepLogs) > 0 {
		_ = DB.Where("job_id = ?", dto.JobID).Delete(&models.CoworkJobStepLog{}).Error
		for i := range stepLogs {
			if stepLogs[i].ID == uuid.Nil {
				stepLogs[i].ID = uuid.New()
			}
			stepLogs[i].JobID = dto.JobID
		}
		if err := DB.Create(&stepLogs).Error; err != nil {
			return err
		}
	}

	if len(approvals) > 0 {
		for i := range approvals {
			if approvals[i].ID == uuid.Nil {
				approvals[i].ID = uuid.New()
			}
			approvals[i].JobID = dto.JobID
		}
		if err := DB.Create(&approvals).Error; err != nil {
			return err
		}
	}

	return nil
}

func SaveCoworkJobScanResult(jobID, scanJSON string) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	return DB.Model(&models.CoworkJob{}).
		Where("job_id = ?", jobID).
		Update("scan_result_json", scanJSON).Error
}

func SaveCoworkJobArtifacts(jobID, artifactJSON, artifactMD string) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	return DB.Model(&models.CoworkJob{}).
		Where("job_id = ?", jobID).
		Updates(map[string]interface{}{
			"artifact_json": artifactJSON,
			"artifact_md":   artifactMD,
		}).Error
}

func GetCoworkJob(jobID string) (*CoworkJobDTO, error) {
	if DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	var row models.CoworkJob
	if err := DB.Where("job_id = ?", jobID).First(&row).Error; err != nil {
		return nil, err
	}
	return coworkJobToDTO(row), nil
}

func ListCoworkJobs(limit, offset int) ([]CoworkJobDTO, int64, error) {
	if DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	var total int64
	DB.Model(&models.CoworkJob{}).Count(&total)

	var rows []models.CoworkJob
	result := DB.Order("updated_at DESC").Limit(limit).Offset(offset).Find(&rows)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	out := make([]CoworkJobDTO, 0, len(rows))
	for _, row := range rows {
		out = append(out, *coworkJobToDTO(row))
	}
	return out, total, nil
}

func UpsertHostImmuneMemory(hostKey string, learned, missed, originOpen int, lastJobID, lastStatus, historyJSON string) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	if hostKey == "" {
		return nil
	}

	var row models.HostImmuneMemory
	err := DB.Where("host_key = ?", hostKey).First(&row).Error
	if err != nil {
		row = models.HostImmuneMemory{
			Base:                 models.Base{ID: uuid.New()},
			HostKey:              hostKey,
			AntibodyLearnedCount: learned,
			ReplayMissedCount:    missed,
			OriginOpenCount:      originOpen,
			LastJobID:            lastJobID,
			LastStatus:           lastStatus,
			HistoryJSON:          historyJSON,
		}
		return DB.Create(&row).Error
	}

	return DB.Model(&row).Updates(map[string]interface{}{
		"antibody_learned_count": learned,
		"replay_missed_count":    missed,
		"origin_open_count":      originOpen,
		"last_job_id":            lastJobID,
		"last_status":            lastStatus,
		"history_json":           historyJSON,
	}).Error
}

func GetHostImmuneMemory(hostKey string) (*models.HostImmuneMemory, error) {
	if DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	var row models.HostImmuneMemory
	if err := DB.Where("host_key = ?", hostKey).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func coworkJobToDTO(row models.CoworkJob) *CoworkJobDTO {
	dto := &CoworkJobDTO{
		JobID:          row.JobID,
		Title:          row.Title,
		TargetURL:      row.TargetURL,
		HostKey:        row.HostKey,
		Scope:          row.Scope,
		AutonomyLevel:  row.AutonomyLevel,
		Status:         row.Status,
		ScanID:         row.ScanID,
		RepoPath:       row.RepoPath,
		DefenseDeltas:  map[string]int{},
		Residuals:      []string{},
		AntibodyLoopOK: row.AntibodyLoopOK,
		FindingsCount:  row.FindingsCount,
		MitigatedCount: row.MitigatedCount,
		LiveChecksRun:  row.LiveChecksRun,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
	if row.DefenseDeltas != "" {
		_ = json.Unmarshal([]byte(row.DefenseDeltas), &dto.DefenseDeltas)
	}
	if row.Residuals != "" {
		_ = json.Unmarshal([]byte(row.Residuals), &dto.Residuals)
	}
	if row.ArtifactJSON != "" || row.ArtifactMD != "" {
		dto.ArtifactPaths = map[string]string{}
		if row.ArtifactJSON != "" {
			dto.ArtifactPaths["json"] = row.ArtifactJSON
		}
		if row.ArtifactMD != "" {
			dto.ArtifactPaths["markdown"] = row.ArtifactMD
		}
	}
	return dto
}
