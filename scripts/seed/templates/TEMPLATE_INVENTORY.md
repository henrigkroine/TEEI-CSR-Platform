# Program Template Inventory

**Total Templates**: 16
**Last Updated**: 2025-11-22

## Quick Reference

| ID | Name | Type | Duration | Participants | Volunteers | Est. Cost | Tags |
|---|---|---|---|---|---|---|---|
| `tmpl-mentor-1on1-000000000001` | Mentorship 1-on-1 (6 months) | mentorship | 24 weeks | 1-100 | 1 | $150 | career, 1-on-1, professional_development |
| `tmpl-mentor-group-000000000002` | Mentorship Group Sessions (3 months) | mentorship | 12 weeks | 4-8 | 1 | $75 | career, group, peer_support, community |
| `tmpl-mentor-tech-000000000003` | Technical Skills Mentorship (4 months) | mentorship | 16 weeks | 1-50 | 1 | $200 | technical, 1-on-1, skills, career_development |
| `tmpl-lang-eng-basic-000000000001` | English Group Sessions (A1-A2) | language | 12 weeks | 6-10 | 1 | $120 | language, english, beginner, group |
| `tmpl-lang-nor-inter-000000000002` | Norwegian Group Sessions (B1-B2) | language | 16 weeks | 5-8 | 1 | $180 | language, norwegian, intermediate, workplace |
| `tmpl-lang-eng-business-000000000003` | Business English 1-on-1 (B2-C1) | language | 12 weeks | 1-1 | 1 | $250 | language, english, business, 1-on-1, advanced |
| `tmpl-lang-ger-intensive-000000000004` | German Intensive (A1-B1) | language | 20 weeks | 8-12 | 2 | $300 | language, german, intensive, integration |
| `tmpl-buddy-1on1-000000000001` | Buddy 1-on-1 Matching (6 months) | buddy | 24 weeks | 1-100 | 1 | $50 | buddy, 1-on-1, integration, cultural_exchange |
| `tmpl-buddy-group-000000000002` | Buddy Group Activities (3 months) | buddy | 12 weeks | 4-6 | 1 | $30 | buddy, group, community, integration |
| `tmpl-buddy-professional-000000000003` | Professional Networking Buddy (4 months) | buddy | 16 weeks | 1-50 | 1 | $100 | buddy, professional, networking, career |
| `tmpl-buddy-family-000000000004` | Family Integration Buddy (12 months) | buddy | 52 weeks | 1-30 | 1 | $200 | buddy, family, integration, long_term |
| `tmpl-upskill-tech-000000000001` | Tech Skills Bootcamp (12 weeks) | upskilling | 12 weeks | 5-30 | 2 | $500 | upskilling, tech, certification, bootcamp |
| `tmpl-upskill-prof-cert-000000000002` | Professional Certifications (16 weeks) | upskilling | 16 weeks | 3-20 | 1 | $800 | upskilling, certification, professional |
| `tmpl-upskill-digital-basics-000000000003` | Digital Literacy Fundamentals (8 weeks) | upskilling | 8 weeks | 8-15 | 2 | $100 | upskilling, digital_literacy, basics, beginner |
| `tmpl-upskill-lang-prof-000000000004` | Language + Professional Skills (20 weeks) | upskilling | 20 weeks | 10-25 | 3 | $400 | upskilling, language, professional, integrated |
| `tmpl-upskill-cloud-000000000005` | Cloud Computing Certification (14 weeks) | upskilling | 14 weeks | 3-15 | 1 | $600 | upskilling, cloud, certification, technical |

## Templates by Program Type

### Mentorship (3 templates)

**Purpose**: Career guidance, professional development, skill transfer

| Template | Format | Duration | Best For |
|---|---|---|---|
| Mentorship 1-on-1 | Individual | 6 months | Career development, integration, job readiness |
| Mentorship Group | Group (4-8) | 3 months | Peer support, community building, shared learning |
| Technical Skills | Individual | 4 months | Technical skill development, career switchers |

**Common Beneficiary Groups**: Refugees, migrants, asylum seekers, newcomers, professionals

---

### Language (4 templates)

**Purpose**: Language proficiency, integration, workplace readiness

| Template | Language | Levels | Format | Best For |
|---|---|---|---|---|
| English Group Sessions | English | A1-A2 | Group (6-10) | Beginners, survival English |
| Norwegian Group Sessions | Norwegian | B1-B2 | Group (5-8) | Intermediate, workplace readiness |
| Business English 1-on-1 | English | B2-C1 | Individual | Professionals, career advancement |
| German Intensive | German | A1-B1 | Group (8-12) | Integration, comprehensive learning |

**Common Beneficiary Groups**: Refugees, migrants, asylum seekers, newcomers, integration seekers

---

### Buddy (4 templates)

**Purpose**: Social integration, cultural exchange, practical support

| Template | Type | Duration | Best For |
|---|---|---|---|
| Buddy 1-on-1 Matching | Social | 6 months | General integration, friendship, cultural exchange |
| Buddy Group Activities | Social | 3 months | Community building, group activities |
| Professional Networking | Career | 4 months | Job seekers, career networking |
| Family Integration | Practical | 12 months | Families, long-term support, practical help |

**Common Beneficiary Groups**: Refugees, migrants, asylum seekers, newcomers, families, youth

---

### Upskilling (5 templates)

**Purpose**: Skill development, certification, career advancement

| Template | Focus | Duration | Platforms | Best For |
|---|---|---|---|---|
| Tech Skills Bootcamp | Tech skills | 12 weeks | LinkedIn, Coursera | Career switchers, tech roles |
| Professional Certifications | Various | 16 weeks | Coursera, Udemy | PMP, Scrum, Analytics, etc. |
| Digital Literacy | Computer basics | 8 weeks | Custom | Beginners, digital inclusion |
| Language + Professional | Integrated | 20 weeks | Udemy, Custom | Hospitality, healthcare, retail |
| Cloud Computing | Cloud tech | 14 weeks | Pluralsight, Coursera | Technical professionals, cloud roles |

**Common Beneficiary Groups**: Refugees, migrants, career switchers, women-in-tech, upskilling seekers

---

## Configuration Examples

### Mentorship Config (1-on-1)

```json
{
  "sessionFormat": "1-on-1",
  "sessionDuration": 60,
  "sessionFrequency": "bi-weekly",
  "totalDuration": 24,
  "matchingCriteria": ["skills", "industry", "language", "career_goals"],
  "autoMatching": false,
  "focusAreas": ["career", "integration", "technical_skills"],
  "outcomesTracked": ["job_readiness", "confidence", "network_building"]
}
```

### Language Config (English A1-A2)

```json
{
  "classSizeMin": 6,
  "classSizeMax": 10,
  "sessionDuration": 90,
  "sessionsPerWeek": 2,
  "totalWeeks": 12,
  "proficiencyLevels": ["A1", "A2"],
  "targetLanguages": ["en"],
  "deliveryMode": "hybrid",
  "curriculumFocus": ["conversational", "survival", "integration"]
}
```

### Buddy Config (1-on-1)

```json
{
  "matchMethod": "interest_based",
  "pairDuration": 24,
  "checkInFrequency": "bi-weekly",
  "requiredCheckIns": 12,
  "suggestedActivities": ["coffee_chat", "city_tour", "cultural_event"],
  "primaryGoals": ["integration", "cultural_exchange", "language_practice"],
  "buddyTrainingRequired": true
}
```

### Upskilling Config (Tech Bootcamp)

```json
{
  "coursePlatforms": ["linkedin_learning", "coursera"],
  "skillTracks": ["web_dev", "data_analytics", "cloud"],
  "difficultyLevels": ["beginner", "intermediate"],
  "certificationRequired": true,
  "minimumCompletionRate": 80,
  "timeToComplete": 12,
  "mentorSupport": true,
  "peerGroupsEnabled": true
}
```

---

## Compatibility Matrix

### Beneficiary Group Tags → Suitable Templates

| Beneficiary Group Tag | Compatible Templates Count | Program Types |
|---|---|---|
| refugees | 16 | All |
| migrants | 16 | All |
| asylum_seekers | 14 | Mentorship, Language, Buddy, Upskilling |
| newcomers | 14 | Mentorship, Language, Buddy, Upskilling |
| integration | 16 | All |
| employment | 11 | Mentorship, Language (some), Buddy (prof), Upskilling |
| women-in-tech | 5 | Mentorship (tech), Language (business), Upskilling (tech) |
| youth | 6 | Mentorship (group), Language (basic), Buddy (all) |
| families | 2 | Buddy (family, group) |
| professionals | 8 | Mentorship (all), Language (business), Buddy (prof), Upskilling (cert, cloud) |

---

## Pricing & Monetization

### Cost Per Participant (USD/EUR)

| Range | Templates | Average |
|---|---|---|
| $0-100 | 4 (Buddy 1-on-1, Buddy Group, Digital Literacy, English Basic) | $50 |
| $101-200 | 5 (Mentorship 1-on-1/Group, Language Norwegian, Buddy Family/Prof) | $150 |
| $201-400 | 4 (Mentorship Tech, Language Business/German, Upskilling Combo) | $287.50 |
| $401-800 | 3 (Upskilling Tech/Cloud/Cert) | $633.33 |

**Platform Average**: $235 per participant across all templates

### Volunteer Hours Required

| Range | Templates | Average |
|---|---|---|
| 0-15 hours | 5 (Buddy 1-on-1/Group, Mentorship 1-on-1, Language Basic/Business) | 12 hours |
| 16-30 hours | 5 (Mentorship Group/Tech, Language Norwegian, Buddy Prof/Family) | 22.8 hours |
| 31-60 hours | 4 (Language German, Upskilling Tech/Digital/Cloud) | 45 hours |
| 61-100 hours | 2 (Upskilling Combo, Language German) | 70 hours |

**Platform Average**: 30.5 volunteer hours per program instance

---

## Usage Statistics (Expected)

### Most Versatile Templates (Broadest Beneficiary Group Fit)

1. Buddy 1-on-1 Matching - 7 compatible group types
2. English Group Sessions (A1-A2) - 6 compatible group types
3. Mentorship 1-on-1 - 6 compatible group types
4. Tech Skills Bootcamp - 6 compatible group types

### Best Value Templates (Cost vs. Impact)

1. Buddy Group Activities - $30 per participant
2. Buddy 1-on-1 Matching - $50 per participant
3. Mentorship Group Sessions - $75 per participant
4. Digital Literacy Fundamentals - $100 per participant

### Most Comprehensive Templates (Duration × Intensity)

1. Family Integration Buddy - 52 weeks, long-term support
2. German Intensive - 20 weeks, 5 sessions/week
3. Language + Professional Skills - 20 weeks, integrated learning
4. Mentorship 1-on-1 - 24 weeks, career-focused

---

## Loading Order

Recommended order for loading templates (dependencies):

1. **No Dependencies**: Load in any order
   - All templates are self-contained
   - No foreign key dependencies between templates

2. **Production Rollout**: Recommended phased approach
   - Phase 1: Core programs (Buddy 1-on-1, English Basic, Mentorship 1-on-1)
   - Phase 2: Specialized programs (Professional Networking, Business English, Tech Mentorship)
   - Phase 3: Advanced programs (Upskilling templates, Intensive languages)
   - Phase 4: Integrated programs (Language + Professional Skills)

---

## Maintenance Schedule

### Regular Review (Quarterly)

- Review template usage statistics
- Update cost estimates based on actual campaign data
- Adjust capacity defaults based on real-world utilization
- Add new templates based on customer requests

### Version Updates (As Needed)

- PATCH: Update descriptions, documentation links, tags
- MINOR: Add optional config fields, new suggested activities
- MAJOR: Breaking config changes, methodology shifts

### Deprecation Criteria

Templates should be considered for deprecation if:
- Usage < 2 campaigns per quarter for 3 consecutive quarters
- SROI consistently < 1.5 (underperforming)
- Superseded by significantly better template version
- Program methodology outdated or ineffective

---

**Maintained By**: Agent 1.3 (program-template-modeler)
**Document Version**: 1.0.0
**Related**: [PROGRAM_TEMPLATES_GUIDE.md](/docs/PROGRAM_TEMPLATES_GUIDE.md)
